'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { POOL, allocateFiveMillion, validateScenario, sensitivity } = require('../js/vidik-public-safety-5m-lab');
const scenarios = require('../data/VIDIK_PUBLIC_SAFETY_5M_SCENARIOS.json');

assert.equal(scenarios.length, 10);
for (const s of scenarios) {
  assert.equal(validateScenario(s).pass, true, s.id);
  const r = allocateFiveMillion(s, 1);
  assert.equal(r.pool, POOL);
  assert.equal(r.synthetic, true);
  assert.equal(r.productionRecommendation, null);
  assert.equal(r.effectEstimate, null);
  assert.equal(r.roi, null);
  assert.equal(r.status, 'LAB_ONLY_NOT_A_REAL_RECOMMENDATION');
  assert.ok(Object.values(r.allocations).reduce((a,b)=>a+b,0) <= POOL);
}
const blocked = allocateFiveMillion(scenarios.find(s=>s.id==='LAB-07'), 0.5);
assert.equal(blocked.unallocated, POOL);
const sens = sensitivity(scenarios[0]);
assert.equal(sens.length, 5);
assert.equal(sens.every(x=>x.result.productionRecommendation===null), true);
const docs = ['data/VIDIK_10_TRACK_EXECUTION.md','data/VIDIK_PUBLIC_SAFETY_5M_LAB.md','data/VIDIK_DECISION_BENCHMARK_V2.md','data/VIDIK_EVIDENCE_ACQUISITION_PIPELINE.md','data/VIDIK_CUSTOMER_LIFECYCLE.md','data/VIDIK_DECISION_RED_TEAM.md','data/VIDIK_TRANSPORTABILITY_MATRIX.md','data/VIDIK_VALUE_BENCHMARK.md','data/VIDIK_DEMO_PACKAGE.md','data/VIDIK_OCTOBER_RELEASE_GATE.md'];
for (const p of docs) assert.equal(fs.existsSync(require('node:path').join(__dirname,'..',p)), true, p);
console.log(`PASS — ${scenarios.length}/10 lab scenarios; synthetic-only recommendation boundary preserved; 10-track execution package present`);
