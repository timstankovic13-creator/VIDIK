'use strict';

const assert = require('assert');
const { normalizeResourceEnvelope, evaluateResourceOptimization } = require('../js/vidik-resource-optimization');

const comparison = [
  { id: 'housing', name: 'Housing First', status: 'ADMISSIBLE' },
  { id: 'ase', name: 'ASE', status: 'ADMISSIBLE' }
];
const models = {
  housing: { capacityPerCad: 0.001, activityPerCapacity: 100, effectPerActivity: 0.002, capacityUnit: 'housing_slots', activityUnit: 'placements', effectUnit: 'stable_housing_probability', evidenceIds: ['cap:housing', 'activity:housing', 'effect:housing'], uncertainty: { low: 0.30, high: 0.50 } },
  ase: { capacityPerCad: 0.002, activityPerCapacity: 100, effectPerActivity: 0.0015, capacityUnit: 'enforcement_capacity', activityUnit: 'enforced_segments', effectUnit: 'serious_harm_avoided_probability', evidenceIds: ['cap:ase', 'activity:ase', 'effect:ase'], uncertainty: { low: 0.10, high: 0.20 } }
};

(async () => {
  // Phase 1: resource quantity is normalized and invalid quantities fail closed.
  assert.deepStrictEqual(normalizeResourceEnvelope({ marginalUnit: { amount: 100000, unit: 'CAD' } }), { status: 'VALID', amount: 100000, unit: 'CAD' });
  assert.throws(() => normalizeResourceEnvelope({ marginalUnit: { amount: 0, unit: 'CAD' } }), /positive-finite/);

  // Phase 2: resource -> capacity -> activity -> outcome is actually calculated.
  const optimized = evaluateResourceOptimization({ marginalUnit: { amount: 100000, unit: 'CAD' } }, comparison, models);
  assert.strictEqual(optimized.status, 'OPTIMIZED');
  assert.strictEqual(optimized.allocation.amount, 100000);
  assert.strictEqual(optimized.candidates[0].translation.capacity.value, 100);
  assert.strictEqual(optimized.candidates[0].translation.activity.value, 10000);
  assert.strictEqual(optimized.candidates[0].translation.outcome.expectedIncrement, 20);

  // Phase 3: competing interventions are compared on marginal expected outcome per dollar.
  assert.strictEqual(optimized.allocation.intervention, 'housing');
  assert.strictEqual(optimized.opportunityCost.foregoneIntervention, 'ase');
  assert.strictEqual(optimized.opportunityCost.difference, 5);

  // Phase 4: every optimized chain carries evidence lineage and bounded uncertainty.
  assert.deepStrictEqual(optimized.candidates.find(x => x.id === 'housing').evidenceIds, models.housing.evidenceIds);
  assert.deepStrictEqual(optimized.candidates.find(x => x.id === 'housing').uncertainty, { low: 0.30, high: 0.50 });
  assert.match(optimized.feedback, /resource -> capacity -> activity -> expected outcome/i);

  // Phase 5: production cannot invent a resource effect when the evidence chain is absent.
  const blocked = evaluateResourceOptimization({ marginalUnit: { amount: 100000, unit: 'CAD' } }, comparison, {});
  assert.strictEqual(blocked.status, 'BLOCKED');
  assert.strictEqual(blocked.allocation, null);
  assert.match(blocked.feedback, /complete evidenced marginal resource-to-outcome chain/i);

  console.log('PASS vidik-resource-optimization.test.js: phases 1-5');
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
