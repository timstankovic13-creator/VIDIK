'use strict';
(function(root){
  const SCHEMA='VIDIK.OutcomeLearning.v14';
  const DEFAULT_CHECKPOINTS=['6-month','1-year','2-year','5-year'];
  const clone=x=>JSON.parse(JSON.stringify(x));
  const required=(o,k)=>o&&o[k]!==undefined&&o[k]!==null&&String(o[k]).trim()!=='';
  const finite=x=>typeof x==='number'&&Number.isFinite(x);
  function addPeriod(date,months){const d=new Date(date+'T00:00:00Z');if(Number.isNaN(d.getTime()))return null;const day=d.getUTCDate();d.setUTCMonth(d.getUTCMonth()+months);if(d.getUTCDate()!==day)d.setUTCDate(0);return d.toISOString().slice(0,10);}
  function validate(input){
    if(!input||!required(input,'decisionId')||!required(input,'municipality')||!required(input,'boundaryDate'))return {ok:false,reason:'DecisionId, municipality, and boundaryDate are required'};
    if(!/^\d{4}-\d{2}-\d{2}$/.test(input.boundaryDate))return {ok:false,reason:'boundaryDate must be YYYY-MM-DD'};
    if(input.status==='BLOCKED'&&input.recommendation!==null)return {ok:false,reason:'Blocked decisions must have null recommendation'};
    if(!Array.isArray(input.metrics)||input.metrics.length===0)return {ok:false,reason:'At least one outcome metric is required'};
    for(const m of input.metrics)if(!required(m,'metricId')||!required(m,'name')||!required(m,'unit'))return {ok:false,reason:'Every metric requires metricId, name, and unit'};
    return {ok:true};
  }
  function plan(input){
    const v=validate(input);if(!v.ok)return v;
    const checkpoints=Array.isArray(input.checkpoints)&&input.checkpoints.length?input.checkpoints:DEFAULT_CHECKPOINTS;
    const months={'6-month':6,'1-year':12,'2-year':24,'5-year':60};
    const schedule=checkpoints.map(label=>({checkpoint:label,dueDate:months[label]!==undefined?addPeriod(input.boundaryDate,months[label]):null,status:'PENDING'}));
    return {ok:true,plan:{schema:SCHEMA,version:'14.0.0',decisionId:input.decisionId,municipality:input.municipality,status:input.status||'PROSPECTIVE',recommendation:input.recommendation===undefined?null:input.recommendation,boundaryDate:input.boundaryDate,baseline:input.baseline||{required:true,status:'PENDING'},causalChain:['resource','capacity','activity','outcome','systemOutcome'],metrics:clone(input.metrics),checkpoints:schedule,recalibrationTriggers:['observed-vs-predicted divergence','parameter drift','material implementation change','evidence-quality change']}};
  }
  function recordCheckpoint(planInput,checkpoint,observations){
    const p=plan(planInput);if(!p.ok)return p;
    const cp=p.plan.checkpoints.find(x=>x.checkpoint===checkpoint);if(!cp)return {ok:false,reason:'Unknown checkpoint'};
    if(!observations||!Array.isArray(observations.metrics))return {ok:false,reason:'Checkpoint requires observed metrics'};
    for(const o of observations.metrics)if(!required(o,'metricId')||!finite(Number(o.observed)))return {ok:false,reason:'Observed metric requires metricId and finite observed value'};
    return {ok:true,record:{schema:SCHEMA,version:'14.0.0',decisionId:p.plan.decisionId,checkpoint,scheduledDate:cp.dueDate,recordedAt:observations.recordedAt||null,metrics:clone(observations.metrics),recalibrationRecommended:Boolean(observations.recalibrationRecommended)}};
  }
  root.VIDIK_OUTCOME_LEARNING_14=Object.freeze({schema:SCHEMA,defaultCheckpoints:DEFAULT_CHECKPOINTS,validate,plan,recordCheckpoint});
})(typeof window!=='undefined'?window:globalThis);
if(typeof module!=='undefined')module.exports=globalThis.VIDIK_OUTCOME_LEARNING_14;
