'use strict';

// VIDIK 9.2.1 hardening: strict validation for transportability, uncertainty, and VOI.
(function(root){
  const DI=root.VIDIK_DECISION_INTELLIGENCE_92;
  if(!DI) throw new Error('VIDIK 9.2 intelligence unavailable');
  const finiteNumber=x=>typeof x==='number'&&Number.isFinite(x);
  const strictTransportability=({sourceGeography,targetGeography,similarity,threshold=.5})=>{
    if(!finiteNumber(similarity)||similarity<0||similarity>1) throw new Error('invalid-transportability-similarity');
    if(!finiteNumber(threshold)||threshold<0||threshold>1) throw new Error('invalid-transportability-threshold');
    if(typeof sourceGeography!=='string'||!sourceGeography.trim()||typeof targetGeography!=='string'||!targetGeography.trim()) throw new Error('invalid-transportability-geography');
    return {sourceGeography,targetGeography,similarity,threshold,pass:similarity>=threshold,reason:similarity>=threshold?'transportable':'insufficient-transportability'};
  };
  const strictUncertainty=(parameters,correlations=[])=>{
    if(!Array.isArray(parameters)||!parameters.length) throw new Error('invalid-uncertainty-parameters');
    const ids=new Set();
    const vars=parameters.map(p=>{if(!p||typeof p.id!=='string'||ids.has(p.id))throw new Error('invalid-uncertainty-parameter-id');ids.add(p.id);const {low,high,mean}=p;if(![low,high,mean].every(finiteNumber)||low>high||mean<low||mean>high)throw new Error('invalid-uncertainty-range:'+p.id);return {id:p.id,low,high,mean};});
    let variance=0,covariance=0;const pairs=new Set();
    vars.forEach(p=>{variance+=Math.pow((p.high-p.low)/3.92,2);});
    correlations.forEach(c=>{if(!c||!ids.has(c.a)||!ids.has(c.b)||c.a===c.b||!finiteNumber(c.rho)||c.rho<-1||c.rho>1)throw new Error('invalid-correlation');const pair=[c.a,c.b].sort().join('|');if(pairs.has(pair))throw new Error('duplicate-correlation');pairs.add(pair);const a=vars.find(x=>x.id===c.a),b=vars.find(x=>x.id===c.b);covariance+=2*c.rho*((a.high-a.low)/3.92)*((b.high-b.low)/3.92);});
    const total=variance+covariance;if(!finiteNumber(total)||total<0)throw new Error('invalid-total-uncertainty');
    return {mean:vars.reduce((s,p)=>s+p.mean,0),variance:total,sd:Math.sqrt(total),covariance};
  };
  const strictVOI=({candidates=[],currentDecision,decisionValue=1,evidenceCost=0})=>{
    if(!Array.isArray(candidates)||!finiteNumber(currentDecision)||!finiteNumber(decisionValue)||decisionValue<0||!finiteNumber(evidenceCost)||evidenceCost<0)throw new Error('invalid-voi-input');
    let best=0;const ranked=candidates.map(c=>{if(!c||!finiteNumber(c.expectedBestValue)||!finiteNumber(c.cost??0)||Number(c.cost??0)<0)throw new Error('invalid-voi-candidate');const alt=Math.max(0,c.expectedBestValue-currentDecision),voi=alt*decisionValue-(evidenceCost||c.cost||0);if(!finiteNumber(voi))throw new Error('invalid-voi-result');best=Math.max(best,voi);return {...c,voi};}).sort((a,b)=>b.voi-a.voi);
    return {expectedValueOfInformation:best,priority:ranked.filter(x=>x.voi>0),ranked};
  };
  DI.version='9.2.1';DI.transportability=strictTransportability;DI.correlatedUncertainty=strictUncertainty;DI.valueOfInformation=strictVOI;root.VIDIK_92_1_HARDENING={strictTransportability,strictUncertainty,strictVOI};
})(typeof window!=='undefined'?window:globalThis);
if(typeof module!=='undefined')module.exports=globalThis.VIDIK_92_1_HARDENING;
