'use strict';
const finite=x=>Number.isFinite(Number(x));
const positive=x=>finite(x)&&Number(x)>0;
const text=x=>String(x??'').trim();
const unit=x=>text(x).toLowerCase()||null;
function normalize(input={}){
  const raw=input||{}; const p=raw.parameter||raw.parameters?.[0]||{};
  const effect=Number(p.effect??raw.effect),resource=Number(p.resource??raw.resource);
  const rawEffect=finite(raw.effect)?Number(raw.effect):null,rawResource=finite(raw.resource)?Number(raw.resource):null;
  const parameterEffect=finite(p.effect)?Number(p.effect):null,parameterResource=finite(p.resource)?Number(p.resource):null;
  const effectUnit=unit(p.effectUnit??raw.effectUnit),resourceUnit=unit(p.resourceUnit??raw.resourceUnit),rawEffectUnit=unit(raw.effectUnit),rawResourceUnit=unit(raw.resourceUnit);
  const hasRawUncertainty=raw.uncertainty!==undefined&&raw.uncertainty!==null;
  const hasParameterUncertainty=p.uncertainty!==undefined&&p.uncertainty!==null;
  const uncertainty=hasRawUncertainty?raw.uncertainty:hasParameterUncertainty?p.uncertainty:{};
  const hasLow=uncertainty&&Object.prototype.hasOwnProperty.call(uncertainty,'low');
  const hasHigh=uncertainty&&Object.prototype.hasOwnProperty.call(uncertainty,'high');
  const uncertaintyInvalid=(hasLow&&!finite(uncertainty.low))||(hasHigh&&!finite(uncertainty.high));
  const conflicts=[];
  if(rawEffect!==null&&parameterEffect!==null&&rawEffect!==parameterEffect)conflicts.push('effect-parameter-conflict');
  if(rawResource!==null&&parameterResource!==null&&rawResource!==parameterResource)conflicts.push('resource-parameter-conflict');
  if(rawEffectUnit&&p.effectUnit&&rawEffectUnit!==effectUnit)conflicts.push('effect-unit-parameter-conflict');
  if(rawResourceUnit&&p.resourceUnit&&rawResourceUnit!==resourceUnit)conflicts.push('resource-unit-parameter-conflict');
  return {id:text(raw.id),name:text(raw.name)||text(raw.id),effect,resource,effectUnit,resourceUnit,verified:p.verification?.status==='verified'||p.verified===true||raw.verification?.status==='verified'||raw.verified===true,evidenceIndependent:Array.isArray(raw.evidence)?new Set(raw.evidence.filter(e=>e.verification?.status==='verified'||e.verified===true).map(e=>text(e.sourceId)).filter(Boolean)).size>=2:false,uncertaintyLow:finite(uncertainty?.low)?Number(uncertainty.low):effect,uncertaintyHigh:finite(uncertainty?.high)?Number(uncertainty.high):effect,uncertaintyInvalid,implementation:raw.implementation||{},equity:raw.equity||{},discoveryOnly:raw.discoveryOnly!==false,leadOnly:raw.leadOnly!==false,effectsImported:raw.effectsImported===true||raw.causalEffectImported===true,statusQuo:raw.statusQuo===true,consistencyConflicts:conflicts};
}
function admissible(raw,context={}){const c=normalize(raw);const reasons=[...c.consistencyConflicts];if(!c.id)reasons.push('candidate-id-missing');if(!finite(c.effect)||c.effect<=0)reasons.push('positive-effect-required');if(!positive(c.resource))reasons.push('positive-resource-required');if(!c.effectUnit||!c.resourceUnit)reasons.push('units-required');if(!c.verified)reasons.push('verified-parameter-required');if(!c.evidenceIndependent)reasons.push('independent-evidence-required');if(c.discoveryOnly||c.leadOnly)reasons.push('discovery-lead-not-eligible');if(c.effectsImported)reasons.push('imported-effect-blocked');if(context.effectUnit&&c.effectUnit!==unit(context.effectUnit))reasons.push('effect-unit-mismatch');if(context.resourceUnit&&c.resourceUnit!==unit(context.resourceUnit))reasons.push('resource-unit-mismatch');return {candidate:c,allowed:reasons.length===0,reasons:[...new Set(reasons)]};}
function dominates(a,b){return a.effect>=b.effect&&a.resource<=b.resource&&(a.effect>b.effect||a.resource<b.resource);}
function optimize(problem,candidates=[],context={}){
  const rows=(Array.isArray(candidates)?candidates:[]).map(c=>admissible(c,context));const eligible=rows.filter(r=>r.allowed).map(r=>({...r.candidate,efficiency:r.candidate.effect/r.candidate.resource}));
  if(!eligible.length)return {problem:text(problem),comparable:true,selected:null,frontier:[],blocked:rows,reason:'no-admissible-candidate'};
  const effects=new Set(eligible.map(c=>c.effectUnit)),resources=new Set(eligible.map(c=>c.resourceUnit));
  if(effects.size!==1||resources.size!==1)return {problem:text(problem),comparable:false,selected:null,frontier:[],blocked:rows,reason:'incomparable-effect-or-resource-units'};
  const sorted=[...eligible].sort((a,b)=>b.efficiency-a.efficiency||b.effect-a.effect||a.id.localeCompare(b.id));
  const frontier=sorted.filter(c=>!sorted.some(b=>b.id!==c.id&&dominates(b,c)));
  const budget=finite(context.budget)?Number(context.budget):null;
  const feasible=budget===null?sorted[0]:eligible.filter(c=>c.resource<=budget).sort((a,b)=>b.effect-a.effect||b.efficiency-a.efficiency||a.id.localeCompare(b.id))[0]||null;
  if(!feasible)return {problem:text(problem),comparable:true,effectUnit:[...effects][0],resourceUnit:[...resources][0],budget,selected:null,frontier:frontier.map(c=>({candidateId:c.id,effect:c.effect,resource:c.resource,efficiency:c.efficiency})),opportunityCost:null,candidates:sorted.map(c=>({candidateId:c.id,effect:c.effect,resource:c.resource,efficiency:c.efficiency})),blocked:rows,reason:'no-budget-feasible-candidate'};
  const alternatives=eligible.filter(c=>c.id!==feasible.id&&!dominates(feasible,c));
  const next=[...alternatives].sort((a,b)=>b.efficiency-a.efficiency||b.effect-a.effect||a.id.localeCompare(b.id))[0]||null;
  const opportunityCost=next?{againstCandidateId:next.id,foregoneEffect:Math.max(0,next.effect-feasible.effect),foregoneEffectUnit:feasible.effectUnit,resourceDifference:next.resource-feasible.resource,resourceUnit:feasible.resourceUnit}:null;
  return {problem:text(problem),comparable:true,effectUnit:[...effects][0],resourceUnit:[...resources][0],budget,selected:{candidateId:feasible.id,efficiency:feasible.efficiency,effect:feasible.effect,resource:feasible.resource},frontier:frontier.map(c=>({candidateId:c.id,effect:c.effect,resource:c.resource,efficiency:c.efficiency})),opportunityCost,candidates:sorted.map(c=>({candidateId:c.id,effect:c.effect,resource:c.resource,efficiency:c.efficiency})),blocked:rows.filter(r=>!r.allowed)};
}
function sensitivityEnvelope(raw={}){const c=normalize(raw);if(!positive(c.resource)||c.uncertaintyInvalid||!finite(c.uncertaintyLow)||!finite(c.uncertaintyHigh))return {defined:false,reason:'uncertainty-or-resource-invalid'};const low=c.uncertaintyLow/c.resource,high=c.uncertaintyHigh/c.resource;return {defined:true,lowEfficiency:Math.min(low,high),highEfficiency:Math.max(low,high),intervalWidth:Math.abs(high-low)};}
module.exports={normalize,admissible,optimize,sensitivityEnvelope};
