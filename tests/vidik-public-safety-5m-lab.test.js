'use strict';
const assert = require('node:assert/strict');
const { POOL, allocateFiveMillion, validateScenario, sensitivity } = require('../js/vidik-public-safety-5m-lab');
const scenarios = require('../data/VIDIK_PUBLIC_SAFETY_5M_SCENARIOS.json');
assert.equal(scenarios.length, 10);
for (const s of scenarios) {
  assert.equal(validateScenario(s).pass, true, s.id);
  const r = allocateFiveMillion(s, 1);
  assert.equal(r.pool, POOL); assert.equal(r.synthetic, true);
  assert.equal(r.productionRecommendation, null); assert.equal(r.effectEstimate, null); assert.equal(r.roi, null);
  assert.equal(r.status, 'LAB_ONLY_NOT_A_REAL_RECOMMENDATION');
  assert.ok(Object.values(r.allocations).reduce((a,b)=>a+b,0) <= POOL);
  for (const c of s.candidates) assert.ok(r.allocations[c.id] >= c.min, `${s.id}:${c.id}:minimum`);
}
assert.equal(allocateFiveMillion(scenarios.find(s=>s.id==='LAB-01')).allocations.A, 3000000);
assert.equal(allocateFiveMillion(scenarios.find(s=>s.id==='LAB-03'), 0.5).allocations.A, 0);
assert.equal(allocateFiveMillion(scenarios.find(s=>s.id==='LAB-03'), 0.5).allocations.B, 4000000);
assert.equal(allocateFiveMillion(scenarios.find(s=>s.id==='LAB-07'), 0.5).unallocated, POOL);
assert.equal(allocateFiveMillion(scenarios.find(s=>s.id==='LAB-04')).allocations.A, 1000000);
assert.equal(allocateFiveMillion(scenarios.find(s=>s.id==='LAB-04')).allocations.B, 4000000);
const minScenario = { id:'MIN-FAIL', name:'minimum failure', syntheticAssumption:true, candidates:[{id:'A',name:'A',min:4000000,max:5000000,unitCost:1,valuePerDollar:1,risk:0.9},{id:'B',name:'B',min:2000000,max:5000000,unitCost:1,valuePerDollar:0.5,risk:0.1}] };
assert.equal(allocateFiveMillion(minScenario, 0.5).blocked, true);
const sens = sensitivity(scenarios.find(s=>s.id==='LAB-06'));
assert.equal(sens.length, 5);
assert.equal(sens.flatMap(x=>x.rows).every(x=>x.result.productionRecommendation===null), true);
console.log('PASS — 10/10 synthetic lab scenarios, constraints, and known-answer mechanics');
