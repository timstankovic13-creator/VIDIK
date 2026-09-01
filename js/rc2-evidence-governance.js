'use strict';

const RC2_EVIDENCE_GOVERNANCE_VERSION='RC2.0.0';
const HISTORICAL_BOUNDARY='2023-12-06';
const CHAIN=['resource','capacity','activity','outcome','systemOutcome','seriousHarm'];
const EXECUTABLE_CHAIN=['resource','capacity','activity','outcome','systemOutcome'];
const required=(o,k)=>o&&o[k]!==undefined&&o[k]!==null&&String(o[k]).trim()!=='';
const https=u=>typeof u==='string'&&/^https:\/\//.test(u);

function classifyPlane(item,boundary=HISTORICAL_BOUNDARY){
  if(!item||!required(item,'asOf')) return {ok:false,reason:'Evidence requires asOf'};
  if(item.temporalEligible===false) return {ok:false,reason:'Evidence is explicitly temporally ineligible'};
  if(String(item.asOf)<=String(boundary)) return {ok:true,plane:'HISTORICAL'};
  return {ok:true,plane:'CURRENT_LEARNING'};
}

function validateEvidence(item,boundary=HISTORICAL_BOUNDARY){
  if(!item||!required(item,'evidenceId')||!required(item,'sourceRecordId')||!required(item,'candidateId')||!required(item,'stage')||!required(item,'asOf')||!required(item,'geography')||!https(item.url)) return {ok:false,reason:'Evidence requires evidenceId, sourceRecordId, candidateId, stage, asOf, geography, and HTTPS url'};
  if(!CHAIN.includes(item.stage)) return {ok:false,reason:'Unknown RC2 evidence stage'};
  if(!required(item,'publicationTimeStatus')) return {ok:false,reason:'Evidence requires publicationTimeStatus'};
  const plane=classifyPlane(item,boundary); if(!plane.ok)return plane;
  if(plane.plane==='HISTORICAL'&&item.publicationTimeStatus==='UNKNOWN') return {ok:false,reason:'Unknown publication timing cannot be admitted historically'};
  return {ok:true,plane:plane.plane};
}

function evaluateChain(evidence,candidateId,boundary=HISTORICAL_BOUNDARY){
  const items=(Array.isArray(evidence)?evidence:[]).filter(e=>e.candidateId===candidateId);
  const valid=[],rejected=[];
  for(const e of items){const v=validateEvidence(e,boundary);(v.ok?valid:rejected).push({evidenceId:e.evidenceId,...v});}
  const historicalStages=new Set(valid.filter(x=>x.plane==='HISTORICAL').map(x=>items.find(e=>e.evidenceId===x.evidenceId).stage));
  const currentStages=new Set(valid.filter(x=>x.plane==='CURRENT_LEARNING').map(x=>items.find(e=>e.evidenceId===x.evidenceId).stage));
  const missingHistorical=EXECUTABLE_CHAIN.filter(s=>!historicalStages.has(s));
  const missingCurrent=EXECUTABLE_CHAIN.filter(s=>!currentStages.has(s));
  const seriousHarmHistorical=historicalStages.has('seriousHarm');
  const seriousHarmCurrent=currentStages.has('seriousHarm');
  return {candidateId,historicalStages:[...historicalStages],currentLearningStages:[...currentStages],missingHistorical,missingCurrent,seriousHarmHistorical,seriousHarmCurrent,rejected};
}

function promotionGate({chain,causalIdentification=false,attribution=false,counterfactual=false,transportability=false,uncertaintyTested=false,sensitivityTested=false,alternativesTested=false,lineageReproducible=false}){
  const failures=[];
  if(!chain||chain.missingHistorical.length) failures.push('historical-executable-chain-incomplete');
  if(!chain||!chain.seriousHarmHistorical) failures.push('serious-harm-pathway-incomplete');
  if(!causalIdentification) failures.push('causal-identification-incomplete');
  if(!attribution) failures.push('attribution-incomplete');
  if(!counterfactual) failures.push('counterfactual-incomplete');
  if(!transportability) failures.push('transportability-incomplete');
  if(!uncertaintyTested) failures.push('uncertainty-not-tested');
  if(!sensitivityTested) failures.push('sensitivity-not-tested');
  if(!alternativesTested) failures.push('alternatives-not-tested');
  if(!lineageReproducible) failures.push('lineage-not-reproducible');
  return {eligible:failures.length===0,failures,recommendation:failures.length?'NO RECOMMENDATION':'ELIGIBLE FOR MODEL EVALUATION'};
}

const api={version:RC2_EVIDENCE_GOVERNANCE_VERSION,historicalBoundary:HISTORICAL_BOUNDARY,chain:CHAIN,executableChain:EXECUTABLE_CHAIN,classifyPlane,validateEvidence,evaluateChain,promotionGate};
if(typeof window!=='undefined')window.VIDIK_RC2_EVIDENCE_GOVERNANCE=Object.freeze(api);
if(typeof module!=='undefined')module.exports=api;
