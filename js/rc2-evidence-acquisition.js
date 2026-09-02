'use strict';

const EXECUTABLE_CHAIN=['resource','capacity','activity','outcome','systemOutcome'];
const SERIOUS_HARM='seriousHarm';
const CHECKPOINTS=['6mo','1yr','2yr','5yr'];

const DEFAULT_PRIORITY={
  resource:10,
  capacity:20,
  activity:30,
  outcome:40,
  systemOutcome:50,
  seriousHarm:60,
  marginalExposure:5,
  counterfactual:6,
  attribution:7,
  transportability:8,
  alternatives:9,
  opportunityCost:11
};

function acquisitionQueue({candidateId, missingStages=[], missingGates=[]}={}){
  if(!candidateId) throw new TypeError('candidateId is required');
  const tasks=[];
  for(const stage of missingStages){
    if(!EXECUTABLE_CHAIN.includes(stage)&&stage!==SERIOUS_HARM) continue;
    tasks.push({candidateId,type:'CHAIN_STAGE',target:stage,priority:DEFAULT_PRIORITY[stage]??99});
  }
  for(const gate of missingGates){
    if(!(gate in DEFAULT_PRIORITY)) continue;
    tasks.push({candidateId,type:'GOVERNANCE_GATE',target:gate,priority:DEFAULT_PRIORITY[gate]});
  }
  return tasks.sort((a,b)=>a.priority-b.priority||a.target.localeCompare(b.target));
}

function freezeAcquisitionPlan(plan){
  const normalized=Array.isArray(plan)?plan.map(x=>Object.freeze({...x})):[];
  return Object.freeze(normalized);
}

function createOutcomeLearningRecord({candidateId,decisionId,baseline,checkpoints=CHECKPOINTS,originalDecisionHash}={}){
  if(!candidateId||!decisionId) throw new TypeError('candidateId and decisionId are required');
  if(!baseline||typeof baseline!=='object') throw new TypeError('baseline is required');
  if(!originalDecisionHash) throw new TypeError('originalDecisionHash is required');
  if(!Array.isArray(checkpoints)||checkpoints.length!==CHECKPOINTS.length||!CHECKPOINTS.every(x=>checkpoints.includes(x))) throw new TypeError('all outcome checkpoints are required');
  return Object.freeze({candidateId,decisionId,originalDecisionHash,baseline:Object.freeze({...baseline}),checkpoints:Object.freeze(CHECKPOINTS.map(checkpoint=>Object.freeze({checkpoint,observed:null,status:'PENDING'}))),historicalDecisionMutable:false});
}

function recordObservedOutcome(record,checkpoint,observed){
  if(!record||!record.checkpoints) throw new TypeError('invalid learning record');
  if(!CHECKPOINTS.includes(checkpoint)) throw new RangeError('unknown outcome checkpoint');
  if(observed===undefined||observed===null) throw new TypeError('observed outcome is required');
  const checkpoints=record.checkpoints.map(x=>x.checkpoint===checkpoint?Object.freeze({...x,observed,status:'RECORDED'}):x);
  return Object.freeze({...record,checkpoints:Object.freeze(checkpoints)});
}

module.exports={EXECUTABLE_CHAIN,SERIOUS_HARM,CHECKPOINTS,acquisitionQueue,freezeAcquisitionPlan,createOutcomeLearningRecord,recordObservedOutcome};
