'use strict';
(function(root){
  const SCHEMA='VIDIK.MunicipalRetrospectiveShadow.v12';
  const clone=x=>JSON.parse(JSON.stringify(x));
  const required=(o,k)=>o&&o[k]!==undefined&&o[k]!==null&&String(o[k]).trim()!=='';
  const https=u=>typeof u==='string'&&/^https:\/\//.test(u);
  const finite=x=>typeof x==='number'&&Number.isFinite(x);
  function validateSource(s){
    if(!s||!required(s,'provider')||!https(s.url)||!required(s,'recordId')||!required(s,'publishedAt')) return {ok:false,reason:'Historical reconstruction requires provider, HTTPS URL, recordId, and publishedAt'};
    return {ok:true};
  }
  function validateDecision(d){
    if(!d||!required(d,'decisionId')||!required(d,'decisionDate')||!required(d,'recommendation')) return {ok:false,reason:'Shadow decision requires decisionId, decisionDate, and recommendation'};
    return {ok:true};
  }
  function validateEvidence(e, decisionDate){
    if(!e||!Array.isArray(e.claims)||e.claims.length===0) return {ok:false,reason:'Historical reconstruction requires at least one evidence claim'};
    for(const c of e.claims){
      if(!required(c,'claimId')||!required(c,'sourceRecordId')||!required(c,'asOf')) return {ok:false,reason:'Every evidence claim requires claimId, sourceRecordId, and asOf'};
      if(c.asOf>decisionDate) return {ok:false,reason:'Future evidence cannot enter a historical reconstruction'};
    }
    return {ok:true};
  }
  function validateOutcome(o){
    if(!o||!required(o,'metric')||!required(o,'measuredAt')||!finite(Number(o.observed))) return {ok:false,reason:'Retrospective outcome requires metric, measuredAt, and finite observed value'};
    return {ok:true};
  }
  function prepare(input){
    if(!input||!required(input,'municipality')||!required(input,'jurisdiction')) return {ok:false,reason:'Municipality and jurisdiction are required'};
    const sv=validateSource(input.source); if(!sv.ok)return sv;
    const dv=validateDecision(input.decision); if(!dv.ok)return dv;
    const ev=validateEvidence(input.evidence,input.decision.decisionDate); if(!ev.ok)return ev;
    if(input.source.publishedAt>input.decision.decisionDate)return {ok:false,reason:'Source published after decision date'};
    for(const c of input.evidence.claims) if(c.sourceRecordId!==input.source.recordId)return {ok:false,reason:'Evidence claim sourceRecordId must match reconstruction source'};
    if(input.outcome){const ov=validateOutcome(input.outcome);if(!ov.ok)return ov;}
    return {ok:true,record:{schema:SCHEMA,version:'12.0.0',mode:input.mode||'retrospective',municipality:input.municipality,jurisdiction:input.jurisdiction,source:clone(input.source),decision:clone(input.decision),evidence:clone(input.evidence),outcome:input.outcome?clone(input.outcome):null,comparison:input.comparison?clone(input.comparison):null}};
  }
  function shadowDecision(input){
    const p=prepare(input); if(!p.ok)return p;
    const r=p.record;
    return {ok:true,shadow:{schema:SCHEMA,mode:'shadow',municipality:r.municipality,jurisdiction:r.jurisdiction,decisionDate:r.decision.decisionDate,decisionId:r.decision.decisionId,recommendation:r.decision.recommendation,evidenceRecordIds:r.evidence.claims.map(c=>c.sourceRecordId),futureEvidenceUsed:false,contemporaneousOnly:true,actualDecision:r.comparison&&r.comparison.actualDecision||null,divergence:r.comparison&&r.comparison.actualDecision?r.decision.recommendation!==r.comparison.actualDecision:null}};
  }
  root.VIDIK_MUNICIPAL_RETROSPECTIVE_SHADOW_12=Object.freeze({schema:SCHEMA,validateSource,validateDecision,validateEvidence,validateOutcome,prepare,shadowDecision});
})(typeof window!=='undefined'?window:globalThis);
if(typeof module!=='undefined')module.exports=globalThis.VIDIK_MUNICIPAL_RETROSPECTIVE_SHADOW_12;
