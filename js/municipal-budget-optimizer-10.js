'use strict';
(function(w){
  const finite=x=>typeof x==='number'&&Number.isFinite(x);
  const clone=x=>JSON.parse(JSON.stringify(x));
  const positive=x=>finite(x)&&x>0;
  function validate(input={}){
    const budget=Number(input.budget), xs=input.interventions;
    if(!finite(budget)||budget<0)return {ok:false,code:'INVALID_BUDGET',message:'Budget must be finite and non-negative.'};
    if(!Array.isArray(xs)||!xs.length)return {ok:false,code:'NO_INTERVENTIONS',message:'A decision universe is required before optimization.'};
    const blocked=xs.filter(x=>x&&((x.evidenceStatus||'').toUpperCase()==='BLOCKED'||x.unknown===true));
    const missing=xs.filter(x=>!x||!finite(Number(x.cost||x.minCost))||!finite(Number(x.maxCost||x.cost))||!finite(Number(x.expectedValue)));
    return {ok:true,budget,blockedCount:blocked.length,missing:missing.map(x=>x&&x.id).filter(Boolean),eligibleCount:xs.length-blocked.length};
  }
  function normalizeOption(x){
    const min=Number(x.minCost??x.cost), max=Number(x.maxCost??x.cost), step=Number(x.increment??x.step??max-min||1), value=Number(x.expectedValue);
    if(!finite(min)||!finite(max)||min<0||max<min||!finite(value)||value<0)return null;
    const increment=positive(step)?step:1;
    const fixed=Number(x.fixedCost??0);
    const unitValue=Number(x.valuePerUnit??(max>0?value/Math.max(max-min||max,1):value));
    if(!finite(fixed)||fixed<0||!finite(unitValue)||unitValue<0)return null;
    return {...clone(x),minCost:min,maxCost:max,increment,fixedCost:fixed,unitValue};
  }
  function dependenciesSatisfied(x,chosen){return (x.dependsOn||[]).every(id=>chosen.has(id));}
  function conflicts(x,chosen){return (x.excludes||[]).some(id=>chosen.has(id));}
  function resourceUsage(x,amount){const r=x.resources||{};const out={};for(const [k,v] of Object.entries(r))out[k]=Number(v)*amount;return out;}
  function feasible(x,amount,chosen,resources,limits){
    if(amount<=0)return true;
    if(!dependenciesSatisfied(x,chosen)||conflicts(x,chosen))return false;
    for(const [k,v] of Object.entries(resourceUsage(x,amount)))if(Number.isFinite(limits?.[k])&&resources[k]+v>limits[k]+1e-9)return false;
    if(x.minShare!=null&&amount>0&&amount/x._budget<Number(x.minShare)-1e-9)return false;
    if(x.maxShare!=null&&amount/x._budget>Number(x.maxShare)+1e-9)return false;
    return true;
  }
  function optimize(input={}){
    const q=validate(input);if(!q.ok)return q;
    const xs=input.interventions.map(normalizeOption).filter(Boolean).filter(x=>(x.evidenceStatus||'').toUpperCase()!=='BLOCKED'&&x.unknown!==true);
    if(!xs.length)return {ok:false,code:'NO_ADMISSIBLE_INTERVENTIONS',message:'No evidence-admissible interventions remain after fail-closed filtering.'};
    const metric=[...new Set(xs.map(x=>x.objectiveMetric||input.objectiveMetric||'common_decision_outcome'))];
    if(metric.length>1)return {ok:false,code:'INCOMPARABLE_OBJECTIVES',message:'Admissible interventions do not share a common decision objective.',objectiveMetrics:metric};
    if(xs.some(x=>x.evidenceStatus&&['UNVERIFIED','EVIDENCE_NEEDED','UNKNOWN'].includes(String(x.evidenceStatus).toUpperCase())))return {ok:false,code:'UNVERIFIED_INTERVENTION',message:'Optimization is blocked until every material candidate has verified evidence, cost, capacity and effect parameters.',unverified:xs.filter(x=>!['SUPPORTED','VERIFIED','ADMISSIBLE'].includes(String(x.evidenceStatus||'').toUpperCase())).map(x=>x.id)};
    const budget=q.budget, limits=input.resourceLimits||{};
    xs.forEach(x=>{x._budget=budget;x._density=x.maxCost>0?x.unitValue:0});
    const ordered=xs.slice().sort((a,b)=>b._density-a._density||String(a.id).localeCompare(String(b.id)));
    let best={value:-Infinity,spent:0,alloc:[],resources:{}};const nodes={count:0,limit:Number(input.nodeLimit||250000)};
    function valueAt(x,amount){return amount<=0?0:(amount>=x.minCost?x.unitValue*Math.max(0,amount-x.fixedCost):0);}
    function upperBound(i,remaining,value){let ub=value,rem=remaining;for(let j=i;j<ordered.length&&rem>0;j++){const x=ordered[j],take=Math.min(x.maxCost,rem);if(take>=x.minCost)ub+=valueAt(x,take);else if(x.minCost>0)continue;rem-=take;}return ub;}
    function dfs(i,remaining,value,alloc,resources,chosen){
      if(++nodes.count>nodes.limit)return;
      if(i>=ordered.length){if(value>best.value+1e-9){best={value,spent:budget-remaining,alloc:alloc.map(clone),resources:clone(resources)}}return;}
      if(upperBound(i,remaining,value)<=best.value+1e-9)return;
      const x=ordered[i];
      dfs(i+1,remaining,value,alloc,resources,chosen);
      const max=Math.min(x.maxCost,remaining);
      if(max<x.minCost||!feasible(x,x.minCost,chosen,resources,limits))return;
      const steps=Math.max(1,Math.floor((max-x.minCost)/x.increment)+1);
      const tries=steps>40?[x.minCost,max]:Array.from({length:steps},(_,k)=>x.minCost+k*x.increment);
      for(const raw of tries){const amount=Math.min(max,raw);if(!feasible(x,amount,chosen,resources,limits))continue;const ru=resourceUsage(x,amount),nr={...resources};let ok=true;for(const [k,v] of Object.entries(ru)){nr[k]=(nr[k]||0)+v;if(Number.isFinite(limits[k])&&nr[k]>limits[k]+1e-9){ok=false;break}}if(!ok)continue;const na=alloc.concat({id:x.id,name:x.name,amount,cost:amount,value:valueAt(x,amount)}),nc=new Set(chosen);nc.add(x.id);dfs(i+1,remaining-amount,value+valueAt(x,amount),na,nr,nc);}
    }
    dfs(0,budget,0,[],{},new Set());
    if(!Number.isFinite(best.value))return {ok:false,code:'NO_FEASIBLE_PORTFOLIO',message:'No feasible portfolio satisfies the full envelope and declared constraints.'};
    const selected=new Set(best.alloc.map(a=>a.id));
    const alternatives=ordered.filter(x=>!selected.has(x.id)).map(x=>({id:x.id,name:x.name,marginalValue:x._density,cost:x.minCost}));
    return {ok:true,status:'OPTIMIZED',objectiveMetric:metric[0],budget,fullEnvelopeCompared:true,allocation:best.alloc,allocated:best.spent,unallocated:Math.max(0,budget-best.spent),objectiveValue:best.value,resourceUsage:best.resources,opportunityCost:alternatives,constraints:{resourceLimits:clone(limits),nodeCount:nodes.count,nodeLimit:nodes.limit},note:best.spent<budget?'VIDIK preserved an explicitly unallocated amount because no additional evidence-backed feasible intervention could absorb it without violating constraints.':'Full budget envelope allocated across the feasible evidence-backed portfolio.'};
  }
  w.VIDIK_MUNICIPAL_BUDGET_OPTIMIZER_10={VERSION:'10.1.0',validate,optimize,contract:'FULL_MUNICIPAL_ENVELOPE_CONSTRAINED_PORTFOLIO',rules:['NO_UNKNOWN_COST','NO_UNKNOWN_EFFECT','FULL_ENVELOPE','STATUS_QUO_EXPLICIT','OPPORTUNITY_COST_EXPLICIT','CONSTRAINTS_HARD','FAIL_CLOSED']};
})(window);
