'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const files=['js/intervention-universe.js','js/municipal-budget-optimizer-10.js','js/vidik-platform-10.js','js/municipal-universe-governance.js','js/vidik-decision-integrity-11.js'];
const store=new Map();
const localStorage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
const context={console,localStorage,setTimeout:(fn)=>fn(),clearTimeout:()=>{}};context.window=context;
vm.createContext(context);
for(const f of files)vm.runInContext(fs.readFileSync(f,'utf8'),context,{filename:f});
assert.strictEqual(context.VIDIK_DECISION_INTEGRITY_11.ready,true);
const P=context.VIDIK_PLATFORM_10;
const problem='violent crime';
const jurisdiction='Ottawa';
const discovered=context.vidikUniverseItemsForProblem(problem).filter(x=>x.authority!=='OUTSIDE_MUNICIPAL_AUTHORITY');
assert.ok(discovered.length>=25,'violent-crime discovery must be broad');
let d=P.createDecision({audience:'municipal',objective:'violent crime reduction',problem,jurisdiction,statusQuo:{description:'Existing municipal allocation'},options:[{id:'placeholder'}],evidence:[{id:'fixture'}],uncertainty:{overall:0.5},opportunityCost:{known:true},equity:{assessed:true},constraints:{budget:100000},provenance:[{id:'fixture'}]});
let r=P.evaluate(d);assert.strictEqual(r.ok,false);assert.strictEqual(r.code,'MUNICIPAL_UNIVERSE_INCOMPLETE');
for(const item of discovered){
  const state=item.id==='ps-status-quo'||item.id==='ps-cvi'?'ADMISSIBLE':'NOT_APPLICABLE';
  const rec={problem,jurisdiction,universeId:item.id,state,rationale:state==='ADMISSIBLE'?'Decision baseline or evidence-backed fixture for integrity test.':'Explicitly classified outside the admissible set for this decision test; separate evidence review remains required.',objectiveMetric:'violent crime reduction'};
  if(state==='ADMISSIBLE'){
    Object.assign(rec,{evidenceIds:['fixture'],cost:0,maxCost:item.id==='ps-cvi'?100000:0,increment:item.id==='ps-cvi'?100000:undefined,capacity:1,expectedValue:item.id==='ps-cvi'?10:0,uncertainty:{low:0,high:1},constraints:{legal:[],implementation:[],capacity:[]}});
    assert.strictEqual(P.verifyMunicipalIntervention(rec).ok,true);
  }
  const v=P.setMunicipalUniverseDisposition(rec);assert.strictEqual(v.ok,true);
}
d=P.createDecision({audience:'municipal',objective:'violent crime reduction',problem,jurisdiction,statusQuo:{description:'Existing municipal allocation'},options:[{id:'placeholder'}],evidence:[{id:'fixture'}],uncertainty:{overall:0.5},opportunityCost:{known:true},equity:{assessed:true},constraints:{budget:100000},provenance:[{id:'fixture'}]});
const universeAssessment=P.assessMunicipalDecisionUniverse(problem,jurisdiction);assert.strictEqual(universeAssessment.optimizable,true,'complete disposition + admissible verified evidence should pass the universe gate');
P.attachMunicipalBudgetOptions(d,{statusQuoBudget:100000,requestedBudget:100000,availableBudget:100000,currency:'CAD',years:1});
assert.ok(Array.isArray(d.budgetOptions)&&d.budgetOptions.length>0,'municipal evaluation requires an attached full budget-scenario set');
r=P.evaluate(d);assert.strictEqual(r.ok,true,'a complete, optimizable universe should evaluate once the required budget scenarios are attached');
const otherProblem='housing';
const otherItem=context.vidikUniverseItemsForProblem(otherProblem).find(x=>x.id==='ho-housing-first');
assert.ok(otherItem);
assert.strictEqual(P.listVerifiedMunicipalInterventions(otherProblem,'Ottawa').length,0,'verification must not leak across decision problems');
const budget=P.attachMunicipalBudgetOptions(d,{statusQuoBudget:100000,requestedBudget:100000,availableBudget:100000,currency:'CAD',years:1});assert.strictEqual(budget.ok,true);
const portfolio=P.optimizeMunicipalPortfolio(d,'full-request');assert.ok(portfolio.ok===true||portfolio.code==='NO_FEASIBLE_PORTFOLIO'||portfolio.code==='OPTIMIZATION_SEARCH_SPACE_TOO_LARGE','portfolio path must optimize or fail closed, never silently rank');if(portfolio.ok)assert.strictEqual(portfolio.solver.fullEnvelopeCompared,true);
const sealed=P.sealDecisionArtifact(d);assert.strictEqual(sealed.ok,true);assert.strictEqual(P.verifySealedDecisionArtifact(sealed.artifact).ok,true);const tampered=JSON.parse(JSON.stringify(sealed.artifact));tampered.payload.problem='tampered';assert.strictEqual(P.verifySealedDecisionArtifact(tampered).ok,false);
const bad=P.setMunicipalUniverseDisposition({problem,jurisdiction,universeId:'does-not-exist',state:'ADMISSIBLE',rationale:'bad'});assert.strictEqual(bad.ok,false);assert.strictEqual(bad.code,'UNKNOWN_UNIVERSE_ITEM');
console.log('VIDIK decision integrity 11: PASS');
