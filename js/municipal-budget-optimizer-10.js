'use strict';
(function(w){
  function validate(input){
    const b=input?.budget, xs=input?.interventions;
    if(!Number.isFinite(b)||b<0)return {ok:false,code:'INVALID_BUDGET'};
    if(!Array.isArray(xs)||!xs.length)return {ok:false,code:'NO_INTERVENTIONS'};
    const missing=xs.filter(x=>!Number.isFinite(x.cost)||!Number.isFinite(x.expectedValue)||!Number.isFinite(x.maxCost));
    return missing.length?{ok:false,code:'INCOMPLETE_PORTFOLIO_PARAMETERS',missing:missing.map(x=>x.id)}:{ok:true};
  }
  function optimize(input){
    const q=validate(input);if(!q.ok)return q;
    const xs=input.interventions.map(x=>({...x})).filter(x=>x.evidenceStatus!=='BLOCKED'&&x.unknown!==true);
    if(!xs.length)return {ok:false,code:'NO_ADMISSIBLE_INTERVENTIONS'};
    const ranked=xs.map(x=>({...x,marginalValue:x.cost>0?x.expectedValue/x.cost:x.expectedValue})).sort((a,b)=>b.marginalValue-a.marginalValue);
    let remaining=input.budget;const allocation=[];
    for(const x of ranked){const spend=Math.min(Math.max(0,x.cost),Math.max(0,Math.min(remaining,x.maxCost)));if(spend>0){allocation.push({id:x.id,amount:spend});remaining-=spend;}}
    return {ok:true,budget:input.budget,allocation,unallocated:remaining,fullEnvelopeCompared:true,opportunityCost:ranked.filter(x=>!allocation.some(a=>a.id===x.id)).map(x=>({id:x.id,marginalValue:x.marginalValue})),note:remaining?'No admissible evidence-backed use for the remaining envelope; VIDIK must not manufacture spending to force a 100% allocation.':'Full budget envelope allocated.'};
  }
  w.VIDIK_MUNICIPAL_BUDGET_OPTIMIZER_10={validate,optimize,contract:'FULL_MUNICIPAL_ENVELOPE'};
})(window);
