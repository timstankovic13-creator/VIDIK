'use strict';

const RC2_EXECUTION_GOVERNANCE_VERSION='RC2.1.0';
const REQUIRED_CHECKPOINTS=['6mo','1yr','2yr','5yr'];
const DECISION_STATES=['ACTIVE','UNDER_REVIEW','EXPIRED','SUPERSEDED','WITHDRAWN','REAUTHORIZED'];

function boolGate(value,name){return value===true?null:`${name}-incomplete`;}

function evaluateExecutionGates({legalAuthority=false,implementationFeasibility=false,equityAssessed=false,measurementReady=false,implementationImpactSeparated=false,decisionLifecycleReady=false}={}){
  const failures=[];
  for(const [value,name] of [[legalAuthority,'legal-authority'],[implementationFeasibility,'implementation-feasibility'],[equityAssessed,'equity-assessment'],[measurementReady,'measurement-readiness'],[implementationImpactSeparated,'implementation-impact-separation'],[decisionLifecycleReady,'decision-lifecycle']]){
    const failure=boolGate(value,name); if(failure) failures.push(failure);
  }
  return Object.freeze({eligible:failures.length===0,failures,recommendation:failures.length?'NO RECOMMENDATION':'ELIGIBLE FOR DECISION'});
}

function evaluateLegalAuthority({authorized=false,restrictionReason=null,jurisdiction=null,effectiveFrom=null,effectiveTo=null}={}){
  if(authorized!==true) return {status:'NOT_AUTHORIZED_OR_UNKNOWN',authorized:false,restrictionReason};
  return {status:'AUTHORIZED',authorized:true,jurisdiction,effectiveFrom,effectiveTo};
}

function evaluateImplementationFeasibility({procurementReady=false,staffingReady=false,infrastructureReady=false,dependenciesResolved=false,timeframeDefined=false}={}){
  const failures=[];
  for(const [v,n] of [[procurementReady,'procurement'],[staffingReady,'staffing'],[infrastructureReady,'infrastructure'],[dependenciesResolved,'dependencies'],[timeframeDefined,'timeframe']]) if(v!==true) failures.push(`${n}-not-ready`);
  return {ready:failures.length===0,failures};
}

function evaluateMeasurementReadiness({metricDefined=false,baselineDefined=false,dataOwnerDefined=false,frequencyDefined=false,denominatorDefined=false,missingDataPolicyDefined=false,revisionPolicyDefined=false,interventionSensitive=false}={}){
  const failures=[];
  for(const [v,n] of [[metricDefined,'metric'],[baselineDefined,'baseline'],[dataOwnerDefined,'data-owner'],[frequencyDefined,'frequency'],[denominatorDefined,'denominator'],[missingDataPolicyDefined,'missing-data-policy'],[revisionPolicyDefined,'revision-policy'],[interventionSensitive,'intervention-sensitivity']]) if(v!==true) failures.push(`${n}-incomplete`);
  return {ready:failures.length===0,failures};
}

function evaluateDistributionalImpact({beneficiariesIdentified=false,bearersIdentified=false,geographicEffectsAssessed=false,differentialEffectsAssessed=false,tradeoffsExposed=false}={}){
  const failures=[];
  for(const [v,n] of [[beneficiariesIdentified,'beneficiaries'],[bearersIdentified,'burden-bearers'],[geographicEffectsAssessed,'geography'],[differentialEffectsAssessed,'differential-effects'],[tradeoffsExposed,'tradeoffs']]) if(v!==true) failures.push(`${n}-incomplete`);
  return {ready:failures.length===0,failures};
}

function classifyImplementationImpact({implemented=false,activityObserved=false,outcomeObserved=false,causalAttributionEstablished=false}={}){
  if(!implemented) return {status:'NOT_IMPLEMENTED',impactClaimAllowed:false};
  if(!activityObserved) return {status:'IMPLEMENTED_ACTIVITY_UNKNOWN',impactClaimAllowed:false};
  if(!outcomeObserved) return {status:'IMPLEMENTED_OUTCOME_PENDING',impactClaimAllowed:false};
  if(!causalAttributionEstablished) return {status:'OUTCOME_OBSERVED_ATTRIBUTION_UNPROVEN',impactClaimAllowed:false};
  return {status:'IMPACT_EVIDENCE_ELIGIBLE',impactClaimAllowed:true};
}

function createDecisionLifecycle({decisionId,originalDecisionHash,status='ACTIVE',reviewAt,checkpointPlan=REQUIRED_CHECKPOINTS}={}){
  if(!decisionId||!originalDecisionHash) throw new TypeError('decisionId and originalDecisionHash are required');
  if(!DECISION_STATES.includes(status)) throw new RangeError('unknown decision lifecycle state');
  if(!reviewAt) throw new TypeError('reviewAt is required');
  if(!Array.isArray(checkpointPlan)||checkpointPlan.length!==REQUIRED_CHECKPOINTS.length||!REQUIRED_CHECKPOINTS.every(x=>checkpointPlan.includes(x))) throw new TypeError('all lifecycle checkpoints are required');
  return Object.freeze({decisionId,originalDecisionHash,status,reviewAt,checkpointPlan:Object.freeze([...REQUIRED_CHECKPOINTS]),historicalDecisionMutable:false});
}

function transitionDecisionLifecycle(record,nextStatus){
  if(!record||!DECISION_STATES.includes(nextStatus)) throw new TypeError('invalid lifecycle transition');
  if(nextStatus==='ACTIVE'&&record.status==='EXPIRED') throw new Error('expired decisions require REAUTHORIZED state before activation');
  const next=nextStatus==='REAUTHORIZED'?'ACTIVE':nextStatus;
  return Object.freeze({...record,status:next,priorStatus:record.status,historicalDecisionMutable:false});
}

function finalRc2Gate({evidenceReady=false,causalReady=false,executionReady=false,stressReady=false,learningReady=false,lineageReady=false}={}){
  const failures=[];
  for(const [v,n] of [[evidenceReady,'evidence'],[causalReady,'causal'],[executionReady,'execution'],[stressReady,'stress'],[learningReady,'outcome-learning'],[lineageReady,'lineage']]) if(v!==true) failures.push(`${n}-gate-incomplete`);
  return Object.freeze({ready:failures.length===0,failures,status:failures.length?'RC2 BLOCKED':'RC2 READY'});
}

module.exports={RC2_EXECUTION_GOVERNANCE_VERSION,REQUIRED_CHECKPOINTS,DECISION_STATES,evaluateExecutionGates,evaluateLegalAuthority,evaluateImplementationFeasibility,evaluateMeasurementReadiness,evaluateDistributionalImpact,classifyImplementationImpact,createDecisionLifecycle,transitionDecisionLifecycle,finalRc2Gate};
