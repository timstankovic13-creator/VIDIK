'use strict';

const assert = require('assert');
const { PRODUCTION_HOUSING_EVIDENCE } = require('../evidence/production-housing-evidence');
const { validateCausalParameter, quantitativeAcquisitionRequirements, buildDecisionAnalysisInputs } = require('../js/decision-quantification');

const realToronto = {
  ...PRODUCTION_HOUSING_EVIDENCE.Toronto,
  verified: true,
  sourceId: 'pubmed-27619826',
  provenance: { sourceId: 'pubmed-27619826', externalId: 'PMID-27619826' }
};

assert.strictEqual(validateCausalParameter(realToronto).valid, true, 'independently verified Toronto causal evidence should qualify as a parameter input');

const realButIncompleteResource = {
  intervention: 'Housing First',
  resourceUnit: 'CAD',
  resourceAmount: 8300000,
  incrementalCapacity: 57,
  incrementalActivity: 57,
  unit: realToronto.unit,
  evidenceId: 'ottawa-srrf-2023',
  provenance: 'Observed municipal resource-to-planned-capacity record; no admissible causal link from this increment to the Toronto trial outcome.',
  uncertainty: { low: 0, high: 0 },
  transportability: { admissible: true }
};
const blockedRequirements = quantitativeAcquisitionRequirements({ candidateId: 'housing-first', causalEvidence: realToronto, marginalResourceEvidence: realButIncompleteResource });
assert.strictEqual(blockedRequirements.complete, false, 'real resource observations must not be promoted into a marginal causal production function without an incremental outcome link');
assert.ok(blockedRequirements.missing.includes('incremental-outcome-required'), 'missing incremental outcome must be explicit');

const candidates = [
  { id: 'housing-first', name: 'Housing First' },
  { id: 'supportive-housing-expansion', name: 'Supportive housing expansion' }
];

function verifiedCausal(estimate, sourceId) {
  return {
    verified: true,
    evidenceType: 'causal',
    estimate,
    unit: 'percentage-point stable-housing outcome',
    uncertainty: { low: estimate * 0.8, high: estimate * 1.2 },
    sourceId,
    provenance: { sourceId, externalId: `${sourceId}-record` },
    transportability: { admissible: true }
  };
}
function verifiedMarginal(id, amount, outcome) {
  return {
    intervention: id,
    resourceUnit: 'CAD',
    resourceAmount: amount,
    incrementalCapacity: 1,
    incrementalActivity: 1,
    incrementalOutcome: outcome,
    unit: 'percentage-point stable-housing outcome',
    evidenceId: `${id}-marginal`,
    evidenceIds: [`${id}-marginal`, `${id}-capacity`, `${id}-activity`],
    provenance: `${id} independently verified resource -> capacity -> activity -> outcome chain`,
    uncertainty: { low: outcome * 0.8, high: outcome * 1.2 },
    transportability: { admissible: true }
  };
}

const ready = buildDecisionAnalysisInputs({
  candidates,
  evidence: {
    'housing-first': { causal: verifiedCausal(45.8, 'toronto-rct-27619826') },
    'supportive-housing-expansion': { causal: verifiedCausal(30, 'supportive-housing-rct-verified') }
  },
  marginalResources: {
    'housing-first': verifiedMarginal('housing-first', 1000000, 45.8),
    'supportive-housing-expansion': verifiedMarginal('supportive-housing-expansion', 500000, 30)
  },
  voiValues: { 'housing-first': 2.5, 'supportive-housing-expansion': 1.5 },
  statusQuo: { explicit: true, effect: 0 }
});

assert.strictEqual(ready.status, 'DECISION_QUANTITATIVE_READY');
assert.strictEqual(ready.recommendationReady, true);
assert.strictEqual(ready.optimization.status, 'OPTIMIZED');
assert.strictEqual(ready.optimization.allocation.intervention, 'supportive-housing-expansion', 'higher evidenced outcome per CAD should win');
assert.ok(ready.optimization.opportunityCost, 'opportunity cost must be retained');
assert.strictEqual(ready.optimization.opportunityCost.foregoneIntervention, 'housing-first');
assert.ok(ready.optimization.opportunityCost.foregoneExpectedIncrement > 0);
assert.ok(ready.analysisInputs['supportive-housing-expansion'].parameter.verified);
assert.strictEqual(ready.analysisInputs['housing-first'].voi.value, 2.5);

const housingModel = ready.optimization.candidates.find(candidate => candidate.id === 'housing-first');
assert.ok(housingModel, 'housing-first must reach the real resource optimizer');
assert.ok(Math.abs(housingModel.effectPerCad - 45.8 / 1000000) < 1e-15, 'effect/resource ratio must come from the supplied marginal chain, not a synthetic unit model');
assert.ok(Math.abs(housingModel.translation.capacity.value - 1) < 1e-12, 'capacity translation must use the supplied incremental capacity');
assert.ok(Math.abs(housingModel.translation.activity.value - 1) < 1e-12, 'activity translation must use the supplied incremental activity');
assert.ok(Math.abs(housingModel.translation.outcome.expectedIncrement - 45.8) < 1e-12, 'outcome translation must preserve the supplied incremental outcome');

const noVoi = buildDecisionAnalysisInputs({
  candidates,
  evidence: {
    'housing-first': { causal: verifiedCausal(45.8, 'toronto-rct-27619826') },
    'supportive-housing-expansion': { causal: verifiedCausal(30, 'supportive-housing-rct-verified') }
  },
  marginalResources: {
    'housing-first': verifiedMarginal('housing-first', 1000000, 45.8),
    'supportive-housing-expansion': verifiedMarginal('supportive-housing-expansion', 500000, 30)
  },
  statusQuo: { explicit: true, effect: 0 }
});
assert.strictEqual(noVoi.recommendationReady, false, 'quantitative optimization must not silently manufacture VOI');
assert.strictEqual(noVoi.status, 'QUANTITATIVE_READY_VOI_OR_GATE_REQUIRED');

console.log('Decision quantification bridge: PASS');
console.log('Real Toronto causal evidence accepted as verified parameter input.');
console.log('Incomplete municipal resource evidence remains blocked at the marginal causal boundary.');
console.log('Complete verified chains produce quantitative optimization and explicit opportunity cost.');
console.log('The optimizer consumes the supplied resource -> capacity -> activity -> outcome chain without synthetic 1:1 factors.');
console.log('Missing VOI remains recommendation-blocking rather than being invented.');
