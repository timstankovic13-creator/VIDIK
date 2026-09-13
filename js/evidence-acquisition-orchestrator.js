'use strict';
const { requiredDataManifest, retrieve, parsePayload, normalizeRecord, validateRecord, buildAcquisitionResult, sha256, buildAcquisitionPlan } = require('./data-acquisition');
const { sourceRegistry } = require('./source-registry');
const { discoverInterventions, evidenceCoverage, hashCandidateUniverse } = require('./intervention-discovery');
const { extractInterventionCandidatesDetailed, mergeInterventionCandidates } = require('./intervention-evidence-extractor');

const CORE_REQUIRED_DOMAINS = Object.freeze(['problem-outcome','local-baseline','population-equity','intervention-universe','implementation','cost-resource','causal-evidence','constraints-feasibility']);

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
  const discoverySources = sourceRegistry({ domains: CORE_REQUIRED_DOMAINS, tags: String(problem).toLowerCase().split(/\s+/) });
  const manifest = requiredDataManifest({ objective, problem, geography, domains: CORE_REQUIRED_DOMAINS });
  return buildAcquisitionPlan({ manifest, candidates: discoverySources });
}

function buildInterventionUniverseSources({ problem, geography, providedSources = [] } = {}) {
  const explicit = Array.isArray(providedSources) ? providedSources : [];
  if (explicit.length) return explicit;
  const terms = [problem, geography].map(value => String(value || '').trim()).filter(Boolean).join(' ');
  return sourceRegistry({ domains: ['intervention-universe'], tags: String(problem).toLowerCase().split(/\s+/) }).map(source => {
    const url = new URL(source.url);
    if (url.searchParams.has('q')) url.searchParams.set('q', terms);
    return { ...source, url: url.toString(), extractionMethod: 'governed-catalog-discovery' };
  });
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
      discoveryRejections.push(...extracted.rejections.map(rejection=>({...rejection,sourceUrl:source.url,datasetId:source.datasetId||source.sourceId||null})));
      continue;
    }
    if(source.domain==='local-baseline'&&source.observation){const local=source.observation;const record=normalizeRecord({source,retrieval:snapshot.retrieval,value:local.value,unit:local.unit,period:local.period||local.asOf||'source-reported-period',geography,aggregation:local.aggregation||'source-reported',extractionMethod:local.extractionMethod||'municipal-adapter',definition:local.definition||null,asOf:local.asOf||null});const validation=validateRecord(record,{now});records.push({...record,status:validation.valid?'supported':'blocked',validation});if(!validation.valid)failures.push(...validation.failures.map(reason=>`${source.url}:${reason}`));}
    else if(source.domain==='causal-evidence'&&source.evidence){const evidence=source.evidence;const record=normalizeRecord({source,retrieval:snapshot.retrieval,value:evidence.estimate,unit:evidence.unit,period:evidence.asOf||'source-reported-period',geography:evidence.targetJurisdiction||geography,aggregation:'causal-effect-estimate',extractionMethod:evidence.extractionMethod||'registered-causal-evidence',definition:evidence.provenance||null,asOf:evidence.asOf||null,quality:evidence.quality||null});const validation=validateRecord(record,{now});records.push({...record,status:validation.valid?'supported':'blocked',causal:true,evidenceId:evidence.id,uncertainty:evidence.uncertainty||null,validation});if(!validation.valid)failures.push(...validation.failures.map(reason=>`${source.url}:${reason}`));}
  } catch(error) { failures.push(`${source.url}:${error.message}`); }
  const mergedRegistry=mergeInterventionCandidates(candidateRegistry||[],acquiredCandidates);
  const candidates=discoverInterventions({problem,candidates:mergedRegistry,localProgramIndex,evidenceIndex});
  const acquisitionTasks=buildEvidenceAcquisitionTasks({problem,geography,candidates});
  const result=buildAcquisitionResult({manifest,candidates:sources,records,gaps:acquisitionTasks.map(task=>`${task.id}:${task.domain}`),failures,snapshots,interventionUniverse:candidates});
  return {...result,governedDiscoveryPlan:buildGovernedDiscoveryPlan({objective,problem,geography}),governedInterventionSources:governedInterventionSources.map(source=>({sourceId:source.sourceId,url:source.url,provider:source.provider})),acquiredInterventionCandidates:acquiredCandidates,discoveryDiagnostics:{scanned:acquiredCandidates.length+discoveryRejections.length,accepted:acquiredCandidates.length,rejected:discoveryRejections.length,rejections:discoveryRejections},candidateCoverage:evidenceCoverage(candidates),candidateUniverseHash:hashCandidateUniverse(candidates),acquisitionTasks,acquisitionPlanHash:sha256({manifest:result.manifest,tasks:acquisitionTasks,candidates:candidates.map(x=>x.id)})};
}
module.exports={CORE_REQUIRED_DOMAINS,buildEvidenceAcquisitionTasks,buildGovernedDiscoveryPlan,buildInterventionUniverseSources,acquireDecisionEvidence};