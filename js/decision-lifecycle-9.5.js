'use strict';
(function(){
  const KEY='VIDIK_DECISION_LIFECYCLE_V9_5';
  const MAX_HISTORY=50;
  const clone=x=>JSON.parse(JSON.stringify(x));
  function stable(x){
    if(Array.isArray(x)) return '['+x.map(stable).join(',')+']';
    if(x&&typeof x==='object') return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}';
    return JSON.stringify(x);
  }
  async function hash(value){
    const data=new TextEncoder().encode(stable(value));
    if(window.crypto?.subtle){
      const b=await crypto.subtle.digest('SHA-256',data);
      return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
    }
    let h=2166136261; for(const n of data){h^=n;h=Math.imul(h,16777619)} return ('00000000'+(h>>>0).toString(16)).slice(-8);
  }
  async function integrityHash(value){
    const copy=clone(value);
    delete copy.integrityHash;
    return hash(copy);
  }
  function read(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}}
  function write(x){localStorage.setItem(KEY,JSON.stringify(x))}
  function decision(){return clone(window.VIDIK_DECISION_9_4||null)}
  function makeRecord(d){
    const integration=window.VIDIK_92_INTEGRATION?.decision;
    const originalRecommendation=d?.recommendation ?? integration?.recommendation ?? null;
    const createdAt=new Date().toISOString();
    return {schema:'VIDIK.DecisionLifecycle.v9.5',decisionId:'VIDIK-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),version:1,status:'ANALYSIS',createdAt,updatedAt:createdAt,originalRecommendation,decisionObject:d,adoptedDecision:null,override:null,outcomes:[],events:[{type:'DECISION_CREATED',at:createdAt,version:1}]};
  }
  async function persist(){
    const d=decision(); if(!d||d.runtimeStatus!=='READY') return {ok:false,reason:'Decision is not READY'};
    let r=read();
    if(!r){r=makeRecord(d)} else {r.decisionObject=d;r.updatedAt=new Date().toISOString();r.version+=1;r.events=r.events||[];r.events.push({type:'RECOMPUTE',at:r.updatedAt,version:r.version})}
    r.integrityHash=await integrityHash(r); write(r); render(r); return {ok:true,record:r}
  }
  async function snapshot(){
    const r=read() || (await persist()).record; if(!r) return {ok:false,reason:'No READY decision'};
    const snap={schema:'VIDIK.DecisionSnapshot.v9.5',capturedAt:new Date().toISOString(),decisionId:r.decisionId,version:r.version,decisionObject:clone(r.decisionObject),originalRecommendation:r.originalRecommendation,adoptedDecision:r.adoptedDecision,override:r.override,outcomes:clone(r.outcomes)};
    snap.hash=await hash(snap); r.snapshot=snap;r.updatedAt=new Date().toISOString();r.events=r.events||[];r.events.push({type:'SNAPSHOT',at:r.updatedAt,hash:snap.hash});r.integrityHash=await integrityHash(r);write(r);render(r);return {ok:true,snapshot:snap};
  }
  async function overrideDecision(){
    const r=read(); if(!r) return {ok:false,reason:'Persist the decision first'};
    const value=document.getElementById('lifecycleOverride')?.value?.trim();const rationale=document.getElementById('lifecycleRationale')?.value?.trim();
    if(!value||!rationale)return {ok:false,reason:'Override decision and rationale are required'};
    r.override={originalRecommendation:r.originalRecommendation,overriddenTo:value,rationale,actor:document.getElementById('lifecycleActor')?.value?.trim()||'human',at:new Date().toISOString()};
    r.adoptedDecision={recommendation:value,source:'HUMAN_OVERRIDE'};r.status='ADOPTED';r.version+=1;r.updatedAt=new Date().toISOString();r.events=r.events||[];r.events.push({type:'HUMAN_OVERRIDE',at:r.updatedAt,version:r.version});r.integrityHash=await integrityHash(r);write(r);await snapshot();return {ok:true,record:read()};
  }
  async function recordOutcome(){
    const r=read();if(!r)return {ok:false,reason:'Persist the decision first'};const predicted=Number(document.getElementById('lifecyclePredicted')?.value),observed=Number(document.getElementById('lifecycleObserved')?.value),checkpoint=document.getElementById('lifecycleCheckpoint')?.value;if(!Number.isFinite(predicted)||!Number.isFinite(observed))return {ok:false,reason:'Predicted and observed outcomes are required'};r.outcomes.push({checkpoint,predicted,observed,delta:observed-predicted,recordedAt:new Date().toISOString()});r.status='REVIEWED';r.version+=1;r.updatedAt=new Date().toISOString();r.events=r.events||[];r.events.push({type:'OUTCOME_REVIEW',checkpoint,at:r.updatedAt,version:r.version});r.integrityHash=await integrityHash(r);write(r);render(r);return {ok:true,record:r};
  }
  async function verify(){const r=read();if(!r)return {ok:false,reason:'No persisted decision'};const expected=r.integrityHash;const actual=await integrityHash(r);return {ok:expected===actual,expected,actual}}
  function render(r){const s=document.getElementById('lifecycleStatus'),m=document.getElementById('decisionMemory');if(!s||!m)return;s.textContent=r?'Lifecycle: '+r.status+' | Decision '+r.decisionId+' | v'+r.version:'Lifecycle: NOT PERSISTED';m.textContent=r?JSON.stringify({decisionId:r.decisionId,status:r.status,version:r.version,originalRecommendation:r.originalRecommendation,adoptedDecision:r.adoptedDecision,override:r.override,outcomes:r.outcomes,snapshotHash:r.snapshot?.hash,integrityHash:r.integrityHash,events:r.events},null,2):''}
  async function init(){
    const existing=read();render(existing);
    document.getElementById('persistDecision')?.addEventListener('click',()=>persist());
    document.getElementById('snapshotDecision')?.addEventListener('click',()=>snapshot());
    document.getElementById('applyOverride')?.addEventListener('click',()=>overrideDecision());
    document.getElementById('recordLifecycleOutcome')?.addEventListener('click',()=>recordOutcome());
    document.getElementById('verifyDecision')?.addEventListener('click',()=>verify().then(x=>{const e=document.getElementById('lifecycleVerify');if(e)e.textContent=x.ok?'INTEGRITY VERIFIED':'INTEGRITY FAILURE'}));
    window.VIDIK_DECISION_LIFECYCLE_9_5={persist,snapshot,overrideDecision,recordOutcome,verify,read};
  }
  window.addEventListener('DOMContentLoaded',init);
})();
