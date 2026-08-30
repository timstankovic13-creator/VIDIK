'use strict';

// VIDIK 9.2.1 hardening: strict validation for transportability, uncertainty, and VOI.
(function(root){
  function finiteNumber(x){ return typeof x === 'number' && Number.isFinite(x); }
  function strictSimilarity(x){
    if(!finiteNumber(x) || x < 0 || x > 1) throw new Error('invalid-transportability-similarity');
    return x;
  }
  function strictTransportability({sourceGeography,targetGeography,similarity,threshold=.5}){
    const s=strictSimilarity(similarity);
    if(!finiteNumber(threshold) || threshold < 0 || threshold > 1) throw new Error('invalid-transportability-threshold');
    if(typeof sourceGeography!=='string'||!sourceGeography.trim()||typeof targetGeography!=='string'||!targetGeography.trim()) throw new Error('invalid-transportability-geography');
    return {sourceGeography,targetGeography,similarity:s,threshold,pass:s>=threshold,reason:s>=threshold?'transportable':'insufficient-transportability'};
  }
  function strictUncertainty(parameters,correlations=[]){
    if(!Array.isArray(parameters)||!parameters.length) throw new Error('invalid-uncertainty-parameters');
    const ids=new Set();
    const vars=parameters.map(p=>{
      if(!p||typeof p.id!=='string'||ids.has(p.id)) throw new Error('invalid-uncertainty-parameter-id');
      ids.add(p.id);
      const low=p.low,high=p.high,mean=p.mean;
      if(![low,high,mean].every(finiteNumber)||low>high||mean<low||mean>high) throw new Error('invalid-uncertainty-range:'+p.id);
      return {id:p.id,low,high,mean};
    });
    const seenPairs=new Set(); let variance=0,covariance=0;
    for(const p of vars) variance+=Math.pow((p.high-p.low)/3.92,2);
    for(const c of correlations){
      if(!c||!ids.has(c.a)||!ids.has(c.b)||c.a===c.b||!finiteNumber(c.rho)||c.rho<-1||c.rho>1) throw new Error('invalid-correlation');
      const pair=[c.a,c.b].sort().join('|'); if(seenPairs.has(pair)) throw new Error('duplicate-correlation'); seenPairs.add(pair);
      const a=vars.find(x=>x.id===c.a),b=vars.find(x=>x.id===c.b);
      covariance+=2*c.rho*((a.high-a.low)/3.92)*((b.high-b.low)/3.92);
    }
    const total=variance+covariance;
    if(!finiteNumber(total)||total<0) throw new Error('invalid-total-uncertainty');
    return {mean:vars.reduce((s,p)=>s+p.mean,0),variance:total,sd:Math.sqrt(total),covariance};
  }
  function strictVOI({candidates=[],currentDecision,decisionValue=1,evidenceCost=0}){
    if(!Array.isArray(candidates)||!finiteNumber(Number(currentDecision))||!finiteNumber(Number(decisionValue))||Number(decisionValue)<0||!finiteNumber(Number(evidenceCost))||Number(evidenceCost)<0) throw new Error('invalid-voi-input');
    let best=0;
    const ranked=candidates.map(c=>{
      if(!c||!finiteNumber(Number(c.expectedBestValue))||!finiteNumber(Number(c.cost??0))||Number(c.cost??0)<0) throw new Error('invalid-voi-candidate');
      const alt=Math.max(0,Number(c.expectedBestValue)-Number(currentDecision));
      const voi=alt*Number(decisionValue)-Number(evidenceCost||c.cost||0);
      if(!finiteNumber(voi)) throw new Error('invalid-voi-result');
      if(voi>best) best=voi;
      return {...c,voi};
    }).sort((a,b)=>b.voi-a.voi);
    return {expectedValueOfInformation:best,priority:ranked.filter(x=>x.voi>0),ranked};
  }
  root.VIDIK_92_1_HARDENING={strictTransportability,strictUncertainty,strictVOI};
})(typeof window!=='undefined'?window:globalThis);

if(typeof module!=='undefined') module.exports=globalThis.VIDIK_92_1_HARDENING;
