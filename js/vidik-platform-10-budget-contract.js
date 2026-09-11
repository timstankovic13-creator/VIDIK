'use strict';
(function (w) {
  const TYPES = Object.freeze(['STATUS_QUO','NO_NEW_MONEY','BUDGET_NEUTRAL_REALLOCATION','CUT_5','CUT_10','CUT_20','INCREMENTAL_SMALL','INCREMENTAL_MODERATE','INCREMENTAL_MAJOR','PARTIAL_25','PARTIAL_50','PARTIAL_75','FULL_REQUEST','MULTI_YEAR','OPERATING','CAPITAL','RESERVE','TARGETED','MIXED_ALLOCATION','OPPORTUNITY_COST']);
  const TYPE_KEYS = Object.freeze({STATUS_QUO:'status-quo',NO_NEW_MONEY:'no-new-money',BUDGET_NEUTRAL_REALLOCATION:'budget-neutral',CUT_5:'cut-5',CUT_10:'cut-10',CUT_20:'cut-20',INCREMENTAL_SMALL:'incremental-small',INCREMENTAL_MODERATE:'incremental-moderate',INCREMENTAL_MAJOR:'incremental-major',PARTIAL_25:'partial-25',PARTIAL_50:'partial-50',PARTIAL_75:'partial-75',FULL_REQUEST:'full-request',MULTI_YEAR:'multi-year',OPERATING:'operating',CAPITAL:'capital',RESERVE:'reserve',TARGETED:'targeted',MIXED_ALLOCATION:'mixed',OPPORTUNITY_COST:'opportunity-cost'});
  function finiteNonNegative(v,label){const n=Number(v);if(!Number.isFinite(n)||n<0)throw new Error(`invalid-${label}`);return n;}
  function generateMunicipalBudgetOptions(input){
    const x=input||{}, statusQuoBudget=finiteNonNegative(x.statusQuoBudget,'status-quo-budget'), requestedBudget=finiteNonNegative(x.requestedBudget,'requested-budget'), availableBudget=finiteNonNegative(x.availableBudget,'available-budget');
    if(availableBudget<requestedBudget)throw new Error('available-budget-below-requested-budget');
    const currency=String(x.currency||'').trim(); if(!currency)throw new Error('currency-required');
    const years=finiteNonNegative(x.years,'years'); if(years<=0)throw new Error('years-required');
    const increment=Math.max(0,requestedBudget-statusQuoBudget);
    const values={
      'status-quo':statusQuoBudget,'no-new-money':statusQuoBudget,'budget-neutral':statusQuoBudget,
      'cut-5':statusQuoBudget*.95,'cut-10':statusQuoBudget*.90,'cut-20':statusQuoBudget*.80,
      'incremental-small':statusQuoBudget+Math.min(increment,Math.max(100000,statusQuoBudget*.05)),
      'incremental-moderate':statusQuoBudget+Math.min(increment,Math.max(500000,statusQuoBudget*.15)),
      'incremental-major':Math.min(requestedBudget,statusQuoBudget+Math.max(0,Math.max(1000000,statusQuoBudget*.50))),
      'partial-25':requestedBudget*.25,'partial-50':requestedBudget*.50,'partial-75':requestedBudget*.75,
      'full-request':requestedBudget,'multi-year':requestedBudget,'operating':requestedBudget,'capital':requestedBudget,
      'reserve':Math.min(availableBudget,requestedBudget),'targeted':requestedBudget,'mixed':Math.min(availableBudget,requestedBudget),
      'opportunity-cost':availableBudget
    };
    return {ok:true,scope:'full-municipal',currency,years,options:TYPES.map(type=>{const key=TYPE_KEYS[type];return{id:`municipal-budget:${key}`,type,amount:values[key],currency,years,statusQuoBudget,requestedBudget,availableBudget};})};
  }
  function exactFixedCostPortfolio(decision,envelope){
    const options=Array.isArray(decision&&decision.options)?decision.options:[],budget=finiteNonNegative(envelope,'starting-envelope');
    if(!options.length)return{scope:'full-municipal',startingEnvelope:budget,selected:[],unallocated:budget,opportunityCost:budget};
    const admissible=options.filter(o=>o&&o.id&&Number.isFinite(Number(o.cost))&&Number(o.cost)>=0&&Number.isFinite(Number(o.expectedValue))&&Number(o.expectedValue)>=0);
    if(admissible.length!==options.length)throw new Error('portfolio-option-missing-cost-or-effect');
    if(admissible.length>24)throw new Error('OPTIMIZATION_SEARCH_SPACE_TOO_LARGE');
    let best=null;const n=admissible.length;
    for(let mask=0;mask<(1<<n);mask++){let cost=0,value=0,selected=[];for(let i=0;i<n;i++)if(mask&(1<<i)){cost+=Number(admissible[i].cost);value+=Number(admissible[i].expectedValue);selected.push(admissible[i]);}if(cost>budget)continue;const candidate={value,cost,selected};if(!best||value>best.value||(value===best.value&&cost<best.cost)||(value===best.value&&cost===best.cost&&selected.map(o=>o.id).join('|')<best.selected.map(o=>o.id).join('|')))best=candidate;}
    if(!best)throw new Error('OPTIMIZATION_NO_FEASIBLE_ALLOCATION');
    return{scope:'full-municipal',startingEnvelope:budget,selected:best.selected,unallocated:budget-best.cost,opportunityCost:budget-best.value};
  }
  function attach(P){if(!P)return false;P.MUNICIPAL_BUDGET_TYPES=TYPES;P.generateMunicipalBudgetOptions=generateMunicipalBudgetOptions;P.attachMunicipalBudgetOptions=function(decision,input){const budgets=generateMunicipalBudgetOptions(input);if(!decision||typeof decision!=='object')return{ok:false,code:'DECISION_REQUIRED'};decision.budgetOptions=budgets.options.slice();return{ok:true,scope:budgets.scope,options:budgets.options};};P.optimizeMunicipalPortfolio=function(decision,budgetId){const budgets=Array.isArray(decision&&decision.budgetOptions)?decision.budgetOptions:[],normalized=TYPE_KEYS[budgetId]||budgetId,chosen=budgets.find(x=>x.id===`municipal-budget:${normalized}`)||budgets.find(x=>x.type===budgetId)||budgets.find(x=>x.type==='FULL_REQUEST')||budgets.find(x=>x.type==='STATUS_QUO');const envelope=chosen?chosen.amount:(decision&&decision.constraints&&decision.constraints.budget);return exactFixedCostPortfolio(decision,envelope);};return true;}
  function install(){if(w.VIDIK_PLATFORM_10)return attach(w.VIDIK_PLATFORM_10);return false;}if(!install()){let attempts=0;const timer=setInterval(()=>{attempts+=1;if(install()||attempts>=200)clearInterval(timer);},10);}
})(typeof window!=='undefined'?window:globalThis);
