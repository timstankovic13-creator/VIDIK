'use strict';
const assert=require('node:assert/strict');
const {allocateFiveMillion}=require('../js/vidik-public-safety-5m-lab');
const scenarios=require('../data/VIDIK_PUBLIC_SAFETY_5M_SCENARIOS.json');
const base=scenarios[0];
for(const s of scenarios){
  const r=allocateFiveMillion(s,1);
  assert.equal(r.status,'LAB_ONLY_NOT_A_REAL_RECOMMENDATION');
  assert.equal(r.productionRecommendation,null);
  assert.equal(r.effectEstimate,null);
  assert.equal(r.roi,null);
}
assert.equal(allocateFiveMillion(base,-0.1).blocked,true);
assert.equal(allocateFiveMillion(base,1.1).blocked,true);
assert.equal(allocateFiveMillion({...base,syntheticAssumption:false},1).blocked,true);
assert.equal(allocateFiveMillion({...base,candidates:[{...base.candidates[0],risk:1.2}]},1).blocked,true);
console.log('PASS — red-team boundary cases: synthetic provenance, production promotion, risk ceiling, and invalid inputs');
