'use strict';
(function(){
  const KEY='VIDIK_DECISION_LIFECYCLE_V9_5';
  const clone=x=>JSON.parse(JSON.stringify(x));
  function read(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}}
  function write(x){localStorage.setItem(KEY,JSON.stringify(x))}
  function finite(x){return typeof x==='number'&&Number.isFinite(x)}
  function driftFor(outcomes){
    if(!outcomes?.length)return {status:'INSUFFICIENT_DATA',sampleSize:0,meanError:null,meanAbsoluteError:null};
    const errors=outcomes.map(o=>Number(o.observed)-Number(o.predicted)).filter(Number.isFinite);
    if(!errors.length)return {status:'INSUFFICIENT_DATA',sampleSize:0,meanError:null,meanAbsoluteError:null};
    const meanError=errors.reduce((a,b)=>a+b,0)/errors.length;
    const mae=errors.reduce((a,b)=>a+Math.abs(b),0)/errors.length;
    return {status:errors.length>=2&&Math.abs(meanError)>Math.max(1,mae*.25)?'DRIFT_DETECTED':'STABLE',sampleSize:errors.length,meanError,meanAbsoluteError:mae};
  }
  function memory(){const r=read();if(!r)return {ok:false,reason:'No persisted decision memory'};return {ok:true,decisionId:r.decisionId,status:r.status,version:r.version,originalRecommendation:r.originalRecommendation,adoptedDecision:r.adoptedDecision,override:r.override,outcomes:clone(r.outcomes||[]),events:clone(r.events||[]),snapshotHash:r.snapshot?.hash,integrityHash:r.integrityHash}}
  async function reviewOutcome(predicted,observed,checkpoint){
    const r=read();if(!r)return {ok:false,reason:'No persisted decision memory'};
    predicted=Number(predicted);observed=Number(observed);if(!finite(predicted)||!finite(observed))return {ok:false,reason:'Predicted and observed outcomes are required'};
    const item={checkpoint:checkpoint||'unspecified',predicted,observed,delta:observed-predicted,absoluteError:Math.abs(observed-predicted),recordedAt:new Date().toISOString()};
    r.outcomes=r.outcomes||[];r.outcomes.push(item);r.status='REVIEWED';r.version=(r.version||1)+1;r.updatedAt=new Date().toISOString();r.events=r.events||[];r.events.push({type:'OUTCOME_REVIEW_V9_6',checkpoint:item.checkpoint,delta:item.delta,at:r.updatedAt,version:r.version});write(r);return {ok:true,record:clone(r),drift:driftFor(r.outcomes)};
  }
  async function recalibrate(){
    const r=read();if(!r)return {ok:false,reason:'No persisted decision memory'};
    const d=driftFor(r.outcomes||[]);if(d.status==='INSUFFICIENT_DATA')return {ok:false,reason:'At least one valid outcome is required',drift:d};
    const baseline=r.calibration?.baseline??0;const adjustment=d.meanError;
    r.calibration={baseline,adjustment,method:'observed-minus-predicted mean error',sampleSize:d.sampleSize,updatedAt:new Date().toISOString()};
    r.drift=d;r.version=(r.version||1)+1;r.updatedAt=new Date().toISOString();r.events=r.events||[];r.events.push({type:'RECALIBRATION',adjustment,sampleSize:d.sampleSize,at:r.updatedAt,version:r.version});write(r);return {ok:true,record:clone(r),drift:d};
  }
  async function detectDrift(){const r=read();if(!r)return {ok:false,reason:'No persisted decision memory'};const d=driftFor(r.outcomes||[]);return {ok:true,drift:d}}
  function render(){const r=read(),m=document.getElementById('decisionMemory');if(m&&r){m.textContent=JSON.stringify({decisionId:r.decisionId,status:r.status,version:r.version,originalRecommendation:r.originalRecommendation,adoptedDecision:r.adoptedDecision,override:r.override,outcomes:r.outcomes,snapshotHash:r.snapshot?.hash,integrityHash:r.integrityHash,calibration:r.calibration,drift:r.drift,events:r.events},null,2)}}
  function init(){
    document.getElementById('v96ReviewOutcome')?.addEventListener('click',async()=>{const x=await reviewOutcome(document.getElementById('v96Predicted')?.value,document.getElementById('v96Observed')?.value,document.getElementById('v96Checkpoint')?.value);const e=document.getElementById('v96Status');if(e)e.textContent=x.ok?'Outcome review recorded':'Review failed: '+x.reason;render()});
    document.getElementById('v96Recalibrate')?.addEventListener('click',async()=>{const x=await recalibrate();const e=document.getElementById('v96Status');if(e)e.textContent=x.ok?'Recalibration recorded':'Recalibration blocked: '+x.reason;render()});
    document.getElementById('v96DetectDrift')?.addEventListener('click',async()=>{const x=await detectDrift();const e=document.getElementById('v96Status');if(e)e.textContent=x.ok?'Drift: '+x.drift.status:'Drift check failed: '+x.reason;render()});
    window.VIDIK_DECISION_LIFECYCLE_9_6={memory,reviewOutcome,recalibrate,detectDrift};
  }
  window.addEventListener('DOMContentLoaded',init);
})();
