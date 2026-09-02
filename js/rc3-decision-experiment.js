'use strict';

const RC3_VERSION='RC3.0.0';
const REQUIRED_CONTRACT=['problem','baseline','intervention','marginalResource','mechanism','predictedOutcome','counterfactual','alternatives','uncertainty','successFailureThresholds','measurementPlan'];
const COUNTERFACTUAL_METHODS=['RANDOMIZED','QUASI_EXPERIMENTAL','MATCHED_COMPARISON','INTERRUPTED_TIME_SERIES','CONTROLLED_BEFORE_AFTER','CONTRIBUTION_ANALYSIS','OBSERVATIONAL','NONE'];
const LEARNING_STATUSES=['PENDING','LEARNING','INCONCLUSIVE_DATA_FAILURE','OBSERVED_SUCCESS','OBSERVED_FAILURE'];
const SPILLOVER_TYPES=['GEOGRAPHIC','POPULATION','SERVICE','TEMPORAL','NONE'];
const STOP_RULES=['MAX_EXPOSURE','REVIEW_POINT','STOP_CONDITION','ROLLBACK_CONDITION','REALLOCATION_CONDITION','ESCALATION_CONDITION'];
const clone=o=>JSON.parse(JSON.stringify(o));
const freezeDeep=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.freeze(o);Object.keys(o).forEach(k=>freezeDeep(o[k]));}return o;};
const required=(o,k)=>o&&o[k]!==undefined&&o[k]!==null&&!(typeof o[k]==='string'&&!o[k].trim());

function createDecisionExperimentContract(input={}){
  const missing=REQUIRED_CONTRACT.filter(k=>!required(input,k));
  if(missing.length) throw new TypeError(`RC3 contract missing: ${missing.join(',')}`);
  if(!input.candidateId||!input.decisionId) throw new TypeError('candidateId and decisionId are required');
  if(!input.historicalDecisionHash) throw new TypeError('historicalDecisionHash is required');
  if(!input.resourceUnit) throw new TypeError('resourceUnit is required');
  const contract=clone({...input,version:RC3_VERSION,status:'PRE_REGISTRATION_REQUIRED',historicalDecisionMutable:false,createdAt:input.createdAt||new Date().toISOString()});
  return freezeDeep(contract);
}

function freezePrediction(contract,prediction={}){
  if(!contract||!contract.decisionId) throw new TypeError('valid decision contract is required');
  if(!required(prediction,'effect')||!required(prediction,'primaryOutcome')||!required(prediction,'evaluationMethod')||!required(prediction,'successThreshold')) throw new TypeError('prediction requires effect, primaryOutcome, evaluationMethod, and successThreshold');
  if(contract.predictionFreeze) throw new Error('prediction is already frozen');
  const next=clone({...contract,predictionFreeze:{...prediction,frozen:true,historicalDecisionHash:contract.historicalDecisionHash},status:'FROZEN_FOR_EVALUATION'});
  return freezeDeep(next);
}

function recordAllocation(contract,allocation){
  if(!contract||!contract.decisionId) throw new TypeError('valid decision contract is required');
  if(!allocation||!required(allocation,'resource')||!required(allocation,'quantity')||!required(allocation,'recipient')||!required(allocation,'startDate')) throw new TypeError('allocation requires resource, quantity, recipient, and startDate');
  const ledger=Array.isArray(contract.allocationLedger)?contract.allocationLedger:[];
  const entry=clone({...allocation,entryId:allocation.entryId||`ALLOC-${ledger.length+1}`});
  return freezeDeep(clone({...contract,allocationLedger:[...ledger,entry],historicalDecisionMutable:false}));
}

function defineCounterfactualDesign(contract,design={}){
  if(!contract||!contract.decisionId) throw new TypeError('valid decision contract is required');
  if(!COUNTERFACTUAL_METHODS.includes(design.method)) throw new TypeError('unsupported counterfactual method');
  if(!required(design,'comparison')||!required(design,'identificationLimitations')) throw new TypeError('counterfactual requires comparison and identificationLimitations');
  return freezeDeep(clone({...contract,counterfactualDesign:design}));
}

function recordSpillover(contract,spillover={}){
  if(!contract||!contract.decisionId) throw new TypeError('valid decision contract is required');
  if(!SPILLOVER_TYPES.includes(spillover.type)) throw new TypeError('unsupported spillover type');
  if(!required(spillover,'detected')||!required(spillover,'measurement')) throw new TypeError('spillover requires detected and measurement');
  const list=Array.isArray(contract.spilloverLog)?contract.spilloverLog:[];
  return freezeDeep(clone({...contract,spilloverLog:[...list,spillover]}));
}

function recordLearningStatus(contract,status,detail={}){
  if(!LEARNING_STATUSES.includes(status)) throw new TypeError('unsupported learning status');
  if(status==='INCONCLUSIVE_DATA_FAILURE'&&!required(detail,'reason')) throw new TypeError('data failure requires reason');
  return freezeDeep(clone({...contract,learningStatus:{status,...detail}}));
}

function defineStopRules(contract,rules={}){
  const missing=STOP_RULES.filter(k=>!required(rules,k));
  if(missing.length) throw new TypeError(`stop rules missing: ${missing.join(',')}`);
  return freezeDeep(clone({...contract,stopRules:rules}));
}

function recordHumanDecision(contract,decision={}){
  if(!contract||!contract.decisionId) throw new TypeError('valid decision contract is required');
  if(!required(decision,'decision')||!required(decision,'reason')) throw new TypeError('human decision requires decision and reason');
  return freezeDeep(clone({...contract,humanDecision:{decision:decision.decision,reason:decision.reason,recordedAt:decision.recordedAt||new Date().toISOString()},vidikRecommendation:contract.vidikRecommendation||null,actualAllocation:contract.actualAllocation||null}));
}

function recordActualAllocation(contract,actualAllocation){
  if(!contract||!contract.humanDecision) throw new TypeError('human decision must be recorded before actual allocation');
  if(!actualAllocation||!required(actualAllocation,'resource')||!required(actualAllocation,'quantity')) throw new TypeError('actual allocation requires resource and quantity');
  return freezeDeep(clone({...contract,actualAllocation}));
}

function validateRC3(contract){
  const failures=[];
  if(!contract||!contract.historicalDecisionMutable===false) failures.push('historical-decision-identity-missing');
  if(!contract?.predictionFreeze) failures.push('prediction-not-frozen');
  if(!contract?.counterfactualDesign) failures.push('counterfactual-design-missing');
  if(!Array.isArray(contract?.spilloverLog)||!contract.spilloverLog.length) failures.push('spillover-assessment-missing');
  if(!contract?.stopRules) failures.push('stop-rules-missing');
  if(!contract?.humanDecision) failures.push('human-decision-separation-missing');
  return {eligible:failures.length===0,failures};
}

module.exports={RC3_VERSION,REQUIRED_CONTRACT,COUNTERFACTUAL_METHODS,LEARNING_STATUSES,SPILLOVER_TYPES,STOP_RULES,createDecisionExperimentContract,freezePrediction,recordAllocation,defineCounterfactualDesign,recordSpillover,recordLearningStatus,defineStopRules,recordHumanDecision,recordActualAllocation,validateRC3};
