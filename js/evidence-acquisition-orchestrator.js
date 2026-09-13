'use strict';
const { requiredDataManifest, retrieve, parsePayload, normalizeRecord, validateRecord, buildAcquisitionResult, sha256, buildAcquisitionPlan } = require('./data-acquisition');
const { sourceRegistry } = require('./source-registry');
const { discoverInterventions, evidenceCoverage, hashCandidateUniverse } = require('./intervention-discovery');
const { extractInterventionCandidatesDetailed, mergeInterventionCandidates } = require('./intervention-evidence-extractor');

const CORE_REQUIRED_DOMAINS = Object.freeze(['problem-outcome','local-baseline','population-equity','intervention-universe','implementation','cost-resource','causal-evidence','constraints-feasibility']);
const DISCOVERY_STOPWORDS = new Set(['a','an','and','are','as','at','be','by','for','from','how','in','into','is','of','on','or','reduce','the','to','with']);

function discoveryTerms(problem) {
  return [...new Set(String(problem || '').toLowerCase().replace(/[^a-z0-9\s-]/g,' ').split(/\s+/).filter(Boolean).filter(term => term.length > 2 && !DISCOVERY_STOPWORDS.has(term)))];
}

function buildDiscoveryQueries({ problem, geography } = {}) {
  const rawProblem = String(problem || '').trim();
  const place = String(geography || '').trim();
  const terms = discoveryTerms(problem);
  const queries = [
    [rawProblem, place].filter(Boolean).join(' '),
    [terms.join(' '), place].filter(Boolean).join(' '),
    [terms.join(' '), 'programs services interventions'].filter(Boolean).join(' '),
    [terms.join(' '), place, 'programs services interventions'].filter(Boolean).join(' ')
  ].filter(Boolean);
  return [...new Set(queries)].slice(0, 4);
}

function buildEvidenceAcquisitionTasks({ problem, geography, candidates = [] } = {}) {
  if (!problem || !geography) throw new Error('evidence-acquisition-task-context-required');
  const tasks=[];
  for(const candidate of candidates) for(const evidenceType of candidate.missingEvidence||[]) {
    const domain=evidenceType==='causal'?'causal-evidence':evidenceType==='implementation'?'implementation':evidenceType==='cost'?'cost-resource':evidenceType==='equity'?'population-equity':evidenceType==='safety'?'constraints-feasibility':'intervention-universe';
    tasks.push({id:`ACQ-${candidate.id}-${evidenceType}`,candidateId:candidate.id,evidenceType,domain,geography,problem,status:'OPEN',priority:evidenceType==='causal'?'critical':'required',query:`${candidate.id} ${problem} ${geography} ${evidenceType} evidence`});
  }
  return tasks;
}

function buildGovernedDiscoveryPlan({ objective, problem, geography }) {
  const discoverySources = sourceRegistry({ domains: CORE_REQUIRED_DOMAINS });
  const manifest = requiredDataManifest({ objective, problem, geography, domains: CORE_REQUIRED_DOMAINS });
  return buildAcquisitionPlan({ manifest, candidates: discoverySources });
}

function buildInterventionUniverseSources({ problem, geography, providedSources = [] } = {}) {
  const explicit = Array.isArray(providedSources) ? providedSources : [];
  if (explicit.length) return explicit;
  const queries = buildDiscoveryQueries({ problem, geography });
  const sources = sourceRegistry({ domains: ['intervention-universe'] });
  const expanded=[];
  for (const source of sources) for (const query of queries) {
    const url = new URL(source.url);
    if (url.searchParams.has('q')) url.searchParams.set('q', query);
    expanded.push({ ...source, url: url.toString(), discoveryQuery: query, extractionMethod: 'governed-catalog-discovery' });
  }
  return expanded;
}

async function acquireDecisionEvidence({objective,problem,geography,localSource,causalSources=[],interventionUniverseSources=[],candidateRegistry,localProgramIndex=[],evidenceIndex={},fetchImpl,now=new Date()}={}) {
  if(!objective||!problem||!geography||!localSource) throw new Error('decision-evidence-acquisition-context-required');
  const manifest=requiredDataManifest({objective,problem,geography,domains:CORE_REQUIRED_DOMAINS});
  const governedInterventionSources = buildInterventionUniverseSources({ problem, geography, providedSources: interventionUniverseSources });
  const sources=[localSource,...causalSources,...governedInterventionSources],records=[],snapshots=[],failures=[],acquiredCandidates=[],discoveryRejections=[];
  for(const source of sources) try {
    const snapshot=await retrieve(source,{fetchImpl,now}); snapshots.push(snapshot.retrieval);
    if(source.domain==='intervention-universe'){
      const payload=parsePayload(snapshot.bytes,snapshot.retrieval.contentType);
      const extracted=extractInterventionCandidatesDetailed(payload.value,source);
      acquiredCandidates.push(...extracted.candidates);
      discoveryRejections.push(...extracted.rejections.map(rejection=>({...rejection,sourceUrl:source.url,datasetId:source.datasetId||source.sourceId||null,discoveryQuery:source.discoveryQuery||null})));
      continue;
    }
    if(source.domain==='local-baseline'&&source.observation){const local=source.observation;const record=normalizeRecord({source,retrieval:snapshot.retrieval,value:local.value,unit:local.unit,period:local.period||local.asOf||'source-reported-period',geography,aggregation:local.aggregation||'source-reported',extractionMethod:local.extractionMethod||'municipal-adapter',definition:local.definition||null,asOf:local.asOf||null});const validation=validateRecord(record,{now});records.push({...record,status:validation.valid?'supported':'blocked',validation});if(!validation.valid)failures.push(...validation.failures.map(reason=>`${source.url}:${reason}`));}
    else if(source.domain==='causal-evidence'&&source.evidence){const evidence=source.evidence;const record=normalizeRecord({source,retrieval:snapshot.retrieval,value:evidence.estimate,unit:evidence.unit,period:evidence.asOf||'source-reported-period',geography:evidence.targetJurisdiction||geography,aggregation:'causal-effect-estimate',extractionMethod:evidence.extractionMethod||'registered-causal-evidence',definition:evidence.provenance||null,asOf:evidence.asOf||null,quality:evidence.quality||null});const validation=validateRecord(record,{now});records.push({...record,status:validation.valid?'supported':'blocked',causal:true,evidenceId:evidence.id,uncertainty:evidence.uncertainty||null,validation});if(!validation.valid)failures.push(...validation.failures.map(reason=>`${source.url}:${reason}`));}
  } catch(error) { failures.push(`${source.url}:${error.message}`); }
  const mergedRegistry=mergeInterventionCandidates(candidateRegistry||[],acquiredCandidates);
  const candidates=discoverInterventions({problem,candidates:mergedRegistry,localProgramIndex,evidenceIndex});
  const matchedIds=new Set(candidates.map(candidate => candidate.id));
  const unmatchedDiscoveredCandidates=mergeInterventionCandidates(acquiredCandidates).filter(candidate => !matchedIds.has(candidate.id)).map(candidate => ({id:candidate.id,name:candidate.name,reason:'discovered-but-not-problem-matched',discovery:candidate.discovery||null}));
  const acquisitionTasks=buildEvidenceAcquisitionTasks({problem,geography,candidates});
  const result=buildAcquisitionResult({manifest,candidates:sources,records,gaps:acquisitionTasks.map(task=>`${task.id}:${task.domain}`),failures,snapshots,interventionUniverse:candidates});
  return {...result,governedDiscoveryPlan:buildGovernedDiscoveryPlan({objective,problem,geography}),governedInterventionSources:governedInterventionSources.map(source=>({sourceId:source.sourceId,url:source.url,provider:source.provider,discoveryQuery:source.discoveryQuery||null})),acquiredInterventionCandidates:acquiredCandidates,discoveryDiagnostics:{scanned:acquiredCandidates.length+discoveryRejections.length,accepted:acquiredCandidates.length,rejected:discoveryRejections.length,rejections:discoveryRejections,unmatched:unmatchedDiscoveredCandidates},candidateCoverage:evidenceCoverage(candidates),candidateUniverseHash:hashCandidateUniverse(candidates),acquisitionTasks,acquisitionPlanHash:sha256({manifest:result.manifest,tasks:acquisitionTasks,candidates:candidates.map(x=>x.id)})};
}
module.exports={CORE_REQUIRED_DOMAINS,DISCOVERY_STOPWORDS,discoveryTerms,buildDiscoveryQueries,buildEvidenceAcquisitionTasks,buildGovernedDiscoveryPlan,buildInterventionUniverseSources,acquireDecisionEvidence};