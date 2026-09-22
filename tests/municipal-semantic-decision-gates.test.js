'use strict';

const assert = require('assert');
const M = require('../js/municipal-decision-mapping');
const C = [
  { id:'housing', params:{ effect:{ causal:true, evidenceIds:['housing-rct'] } } },
  { id:'ase', params:{ effect:{ causal:true, evidenceIds:['ase-eval'] } } },
  { id:'paramedic', params:{} }
];

assert.deepStrictEqual(M.cities, ['Ottawa','Toronto','Melbourne']);
for (const city of M.cities) {
  const spec = M.citySpec(city);
  assert.ok(spec.dataset);
  assert.ok(spec.measure.field);
  assert.ok(spec.measure.unit);
  assert.ok(spec.measure.aggregation);
  assert.ok(spec.measure.role === 'observed_context');
  assert.strictEqual(spec.measure.parameter, 'housing.need');
}

const ottawa = M.decisionParameters('Ottawa', C[0]);
assert.strictEqual(ottawa.admissibility.admissible, true);
assert.strictEqual(ottawa.admissibility.causalEvidence.mode, 'transported');
assert.strictEqual(ottawa.admissibility.observation.parameter, 'housing.need');

const toronto = M.decisionParameters('Toronto', C[0]);
assert.strictEqual(toronto.admissibility.admissible, true);
assert.strictEqual(toronto.admissibility.causalEvidence.mode, 'transported');
assert.strictEqual(toronto.admissibility.observation.dataset, 'toronto-tsss-2024');

const melbourne = M.decisionParameters('Melbourne', C[0]);
assert.strictEqual(melbourne.admissibility.admissible, false);
assert.ok(melbourne.admissibility.failures.includes('causal-effect-not-transportable-to-city'));

for (const city of M.cities) {
  const ase = M.decisionParameters(city, C[1]);
  assert.strictEqual(ase.admissibility.admissible, false);
  assert.ok(ase.admissibility.failures.includes('city-specific-ase-admissibility-evidence-missing'));
}

const paramedic = M.decisionParameters('Ottawa', C[2]);
assert.strictEqual(paramedic.admissibility.admissible, false);
assert.ok(paramedic.admissibility.failures.includes('no-city-specific-semantic-mapping'));

console.log('municipal-semantic-decision-gates: PASS');
