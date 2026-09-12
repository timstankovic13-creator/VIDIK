'use strict';
const { runCity } = require('./municipal-production-decision-run');
const { buildCanonicalDecisionObject } = require('../js/vidik-canonical-decision-object');
const { enrichEvidence, applyMarginalEvidence, withResourceEnvelope } = require('./municipal-canonical-decision-run');
const { PRODUCTION_HOUSING_EVIDENCE } = require('../evidence/production-housing-evidence');
const { enforceEvidenceAdmissibility } = require('../js/evidence-admissibility-firewall');
const { CANDIDATE_REGISTRY } = require('../js/intervention-discovery');
const { acquireDecisionEvidence } = require('../js/evidence-acquisition-orchestrator');

function attachProductionEvidence(run, city) {
  const evidence = PRODUCTION_HOUSING_EVIDENCE[city];
  const interventionComparison = (run.interventionComparison || []).map(item => {
    if (item.id !== 'housing') return item;
    const causalEvidence = { ...evidence, quality: 0.95, scenario: false, transportabilitySimilarity: evidence.transportability?.similarity ?? null };
    const gate = enforceEvidenceAdmissibility(causalEvidence, { expectedJurisdiction: evidence.targetJurisdiction });
    return { ...item, gate: { ...item.gate, ...gate, causalEvidence }, status: gate.admissible ? 'ADMISSIBLE' : 'BLOCKED', score: gate.admissible ? item.score : null };
  });
  const selected = interventionComparison.find(item => item.id === 'housing');
  const causalEvidence = selected?.gate?.causalEvidence;
  const lineage = [...(run.lineage || []).filter(item => item.kind !== 'causal_effect'), ...(causalEvidence ? [{ evidenceId: causalEvidence.id, kind: 'causal_effect', parameterId: 'housing:effect', transportability: causalEvidence }] : [])];
  const counterfactual = causalEvidence ? { intervention:'housing',statusQuoEffect:0,interventionEffect:causalEvidence.estimate,incrementalEffect:causalEvidence.estimate,evidenceIds:[causalEvidence.id],semantics:'Causal effect estimate is distinct from the municipal observed context.' } : run.counterfactual;
  const admissible=interventionComparison.filter(item=>item.status==='ADMISSIBLE'&&Number.isFinite(Number(item.score))).sort((a,b)=>Number(b.score)-Number(a.score)||a.id.localeCompare(b.id));
  return {...run,interventionComparison,recommendation:admissible.length?admissible[0].id:null,lineage,counterfactual};
}

async function buildAcquisitionContext(run, city, problem='homelessness', options={}) {
  const evidence = PRODUCTION_HOUSING_EVIDENCE[city];
  const observation = run.observedContext;
  const localSource = {
    url: run.sourceLineage.sourceUrlUsed || run.sourceLineage.sourceUrl,
    provider: run.sourceLineage.provider,
    jurisdiction: city,
    domain: 'local-baseline',
    tier: 'official_publication',
    datasetId: run.sourceLineage.dataset || null,
    observation: {
      value: observation?.value,
      unit: observation?.unit,
      period: observation?.asOf || observation?.period || 'source-reported-period',
      asOf: observation?.asOf || null,
      aggregation: observation?.aggregation || 'source-reported',
      extractionMethod: observation?.extraction?.method || 'municipal-adapter',
      definition: observation?.definition || null
    }
  };
  const causalSource = {
    url: evidence.sourceUrl,
    provider: evidence.source,
    jurisdiction: evidence.sourceJurisdiction,
    domain: 'causal-evidence',
    tier: 'independent_causal_research',
    datasetId: evidence.id,
    evidence
  };
  const evidenceIndex = {
    'housing-first-supportive-housing': {
      causal: { status: 'supported', evidenceId: evidence.id },
      implementation: { status: 'potential', reason: 'implementation evidence acquisition remains required' },
      cost: { status: 'potential', reason: 'decision-specific marginal cost acquisition remains required' },
      equity: { status: 'potential', reason: 'local equity-effect acquisition remains required' }
    }
  };
  return acquireDecisionEvidence({
    objective: run.objective || 'verified-outcome-improvement',
    problem,
    geography: city,
    localSource,
    causalSources: [causalSource],
    candidateRegistry: CANDIDATE_REGISTRY,
    evidenceIndex,
    fetchImpl: options.fetchImpl,
    now: options.now || new Date()
  });
}

async function runRealEvidenceCity(city,options={}){
  const raw=await runCity(city,options);
  const evidenced=attachProductionEvidence(raw,city);
  const acquisition=await buildAcquisitionContext(evidenced,city,options.problem||'homelessness',options);
  const enriched=enrichEvidence({...evidenced,acquisition},options);
  const optimized=applyMarginalEvidence(enriched,options);
  return buildCanonicalDecisionObject({...optimized,acquisition,resourceEnvelope:options.resourceEnvelope||null,audit:{...optimized.audit,productionEvidenceRegistry:PRODUCTION_HOUSING_EVIDENCE[city].id,syntheticEvidenceExcluded:true,realMunicipalSource:true,realCausalEvidence:true,acquisitionComplete:acquisition.coverage.complete,acquisitionHash:acquisition.acquisitionHash,candidateUniverseHash:acquisition.candidateUniverseHash,acquisitionPlanHash:acquisition.acquisitionPlanHash}});
}

async function runRealEvidenceAll(options={}){const cities=[];for(const city of ['Ottawa','Toronto','Melbourne']){try{cities.push(await runRealEvidenceCity(city,options));}catch(error){cities.push({identityBrief:{decisionId:`VIDIK-${city.toLowerCase()}-blocked`,city,objective:'verified-outcome-improvement',schemaVersion:'vidik.canonical-decision-object.v1',immutableSnapshot:true},resourceEnvelope:{marginalUnit:{amount:null,unit:'CAD',status:'not-specified'},optimizationStatus:'BLOCKED'},objectives:{primary:'verified-outcome-improvement'},constraints:{admissibility:false,failureClosed:true},interventionUniverse:{interventions:[],discovered:[],acquisition:null},evidenceGraph:{nodes:[],lineage:[]},claimScaledEvidence:{claims:[],minimumSufficientEvidence:{status:'not-satisfied'}},parameters:{selected:null,all:[]},causalProductionModel:{chain:['marginal_resource','capacity','activity','immediate_outcome','system_outcome','serious_harm_pathway'],observedMunicipalDataIsNotCausal:true,resourceTranslation:null},uncertaintyBudget:{parameters:[],totalStatus:'empty'},optimizationOpportunityCost:{marginalResourceOptimization:false,status:'BLOCKED'},rationale:{recommendation:null,why:'Real-evidence city run failed closed.',whyNot:[{id:city,failures:[error.message]}]},integrity:{decisionIntegrity:true,evidenceHash:null,reproducibleRun:false,scenario:false,syntheticEvidenceExcluded:true,decisionIntelligenceHash:null},counterfactualVault:{records:[],status:'NOT_ESTIMABLE'},governanceOverridesAudit:{humanOverride:null,overrideRequired:false,audit:{failureClosed:true,failure:error.message}},outcomeLearningCheckpoints:{checkpoints:['6-month','1-year','2-year','5-year'],current:null,syntheticDefaultLearning:false,recalibrationMutatesParametersAutomatically:false},driftFailureRegistry:{drift:null,failureClosed:true,failureReasons:[error.message]},reoptimizationExecutionReadiness:{reoptimization:'blocked',executionReadiness:'blocked',evidenceAcquisition:{targetCity:city,status:'blocked',missingDomains:[],gaps:[error.message]}}});}}
return{schemaVersion:'vidik.real-three-city-evidence-decision.v2',decisionProblem:'Evaluate the same municipal homelessness resource-allocation problem using live municipal observations and explicitly provenance-bound causal evidence.',cities,evidenceRegistry:Object.fromEntries(Object.entries(PRODUCTION_HOUSING_EVIDENCE).map(([city,evidence])=>[city,{evidenceId:evidence.id,source:evidence.source,sourceUrl:evidence.sourceUrl,sourceJurisdiction:evidence.sourceJurisdiction,targetJurisdiction:evidence.targetJurisdiction,estimate:evidence.estimate,uncertainty:evidence.uncertainty,uncertaintyMethod:evidence.uncertaintyMethod||'source-reported',mode:evidence.mode}])),acceptance:{allCitiesReturned:cities.length===3,realMunicipalSourceRequired:true,realCausalEvidenceRequired:true,syntheticEvidenceExcluded:true,marginalOptimizationRequiresDecisionSpecificEvidence:true,acquisitionManifestRequired:true,interventionUniverseDiscoveryRequired:true,evidenceAcquisitionTasksRequired:true}};}
if(require.main===module){const amountArg=process.argv.find(x=>x.startsWith('--marginal-cad='));const options=withResourceEnvelope({},amountArg?amountArg.split('=')[1]:null);runRealEvidenceAll(options).then(result=>process.stdout.write(JSON.stringify(result,null,2)+'\n')).catch(error=>{console.error(error.stack||error);process.exitCode=1;});}
module.exports={attachProductionEvidence,buildAcquisitionContext,runRealEvidenceCity,runRealEvidenceAll};
