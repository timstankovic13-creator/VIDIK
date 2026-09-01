'use strict';
(function(root){
  const SCHEMA='VIDIK.EvidenceCeiling.v13';
  const REQUIRED_STAGES=['resource','capacity','activity','outcome','systemOutcome'];
  const clone=x=>JSON.parse(JSON.stringify(x));
  const required=(o,k)=>o&&o[k]!==undefined&&o[k]!==null&&String(o[k]).trim()!=='';
  const https=u=>typeof u==='string'&&/^https:\/\//.test(u);
  function validateSource(s){
    if(!s||!required(s,'recordId')||!required(s,'provider')||!https(s.url)||!required(s,'publishedAt')) return {ok:false,reason:'Evidence source requires recordId, provider, HTTPS url, and publishedAt'};
    return {ok:true};
  }
  function validateClaim(c,boundary){
    if(!c||!required(c,'claimId')||!required(c,'stage')||!required(c,'sourceRecordId')||!required(c,'asOf')) return {ok:false,reason:'Evidence claim requires claimId, stage, sourceRecordId, and asOf'};
    if(!REQUIRED_STAGES.includes(c.stage)) return {ok:false,reason:'Evidence claim stage is not in the executable marginal chain'};
    if(c.asOf>boundary) return {ok:false,reason:'Evidence after the decision boundary is not admissible'};
    if(c.temporalEligible===false) return {ok:false,reason:'Evidence claim is explicitly temporally ineligible'};
    return {ok:true};
  }
  function prepare(input){
    if(!input||!required(input,'decisionBoundary')||!Array.isArray(input.candidates)||input.candidates.length===0) return {ok:false,reason:'Decision boundary and at least one candidate are required'};
    const claims=Array.isArray(input.claims)?input.claims:[];
    const sources=Array.isArray(input.sources)?input.sources:[];
    const sourceIds=new Set();
    for(const s of sources){const v=validateSource(s);if(!v.ok)return v;sourceIds.add(s.recordId);if(s.publishedAt>input.decisionBoundary)return {ok:false,reason:'Source published after the decision boundary'};}
    for(const c of claims){const v=validateClaim(c,input.decisionBoundary);if(!v.ok)return v;if(!sourceIds.has(c.sourceRecordId))return {ok:false,reason:'Claim references an unregistered evidence source'};}
    return {ok:true,record:{schema:SCHEMA,version:'13.0.0',decisionBoundary:input.decisionBoundary,candidates:clone(input.candidates),sources:clone(sources),claims:clone(claims)}};
  }
  function evaluate(input){
    const p=prepare(input);if(!p.ok)return p;
    const r=p.record;
    const gates={};
    for(const candidate of r.candidates){
      const id=typeof candidate==='string'?candidate:candidate.candidateId;
      if(!required({id},'id')) return {ok:false,reason:'Every candidate requires candidateId'};
      const candidateClaims=r.claims.filter(c=>c.candidateId===id);
      const present=new Set(candidateClaims.map(c=>c.stage));
      const missing=REQUIRED_STAGES.filter(stage=>!present.has(stage));
      gates[id]={candidateId:id,admissibleStages:REQUIRED_STAGES.filter(s=>present.has(s)),missingStages:missing,status:missing.length?'BLOCKED':'ELIGIBLE',recommendation:missing.length?null:'ELIGIBLE FOR MODEL EVALUATION',requiredNextEvidence:missing.map(stage=>({stage,requirement:'admissible candidate-specific evidence'}))};
    }
    const blocked=Object.values(gates).some(g=>g.status==='BLOCKED');
    return {ok:true,decision:{schema:SCHEMA,version:'13.0.0',status:blocked?'NO RECOMMENDATION':'READY FOR MODEL EVALUATION',blocked,decisionBoundary:r.decisionBoundary,gates},record:r};
  }
  function reopenCondition(evaluation,candidateId){
    if(!evaluation||!evaluation.gates||!evaluation.gates[candidateId]) return {ok:false,reason:'Unknown candidate'};
    const g=evaluation.gates[candidateId];
    return {ok:true,candidateId,canReopen:g.missingStages.length===0,condition:g.missingStages.length?'All missing stages must be satisfied by admissible candidate-specific evidence':'All required marginal-chain stages are satisfied'};
  }
  root.VIDIK_EVIDENCE_CEILING_13=Object.freeze({schema:SCHEMA,requiredStages:REQUIRED_STAGES,validateSource,validateClaim,prepare,evaluate,reopenCondition});
})(typeof window!=='undefined'?window:globalThis);
if(typeof module!=='undefined')module.exports=globalThis.VIDIK_EVIDENCE_CEILING_13;
