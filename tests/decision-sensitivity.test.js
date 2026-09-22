'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { buildSensitivityAnalysis } = require('../js/decision-sensitivity');
const { buildDecisionAnalysisInputs } = require('../js/decision-quantification');

const baseRows = [
  { id: 'a', effect: 10, resource: 10, uncertainty: { low: 7, high: 12 } },
  { id: 'b', effect: 8, resource: 10, uncertainty: { low: 7, high: 11 } },
];

test('sensitivity records explicit uncertainty scenarios and recommendation flips', () => {
  const result = buildSensitivityAnalysis(baseRows);
  assert.equal(result.status, 'ANALYZED');
  assert.equal(result.pointRecommendation, 'a');
  assert.equal(result.scenarios.length, 4);
  assert.ok(result.recommendationFlips.some(s => s.variedCandidateId === 'a' && s.bound === 'low'));
  assert.equal(result.robust, false);
  assert.equal(result.candidateRobustness.a.changesRecommendation, true);
});

test('sensitivity marks a genuinely separated recommendation robust', () => {
  const result = buildSensitivityAnalysis([
    { id: 'a', effect: 20, resource: 10, uncertainty: { low: 18, high: 22 } },
    { id: 'b', effect: 8, resource: 10, uncertainty: { low: 7, high: 9 } },
  ]);
  assert.equal(result.pointRecommendation, 'a');
  assert.equal(result.recommendationFlips.length, 0);
  assert.equal(result.robust, true);
});

test('quantitative decision output exposes sensitivity instead of hiding uncertainty', () => {
  const result = buildDecisionAnalysisInputs({
    candidates: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
    evidence: {
      a: { causal: { verified: true, evidenceType: 'causal', estimate: 20, unit: 'outcomes', uncertainty: { low: 18, high: 22 }, transportability: { admissible: true }, sourceId: 'ca' }, marginalResource: { intervention: 'a', resourceAmount: 10, resourceUnit: 'CAD', incrementalCapacity: 1, incrementalActivity: 1, incrementalOutcome: 20, capacityUnit: 'capacity', activityUnit: 'activity', unit: 'outcomes', evidenceId: 'm1', evidenceIds: ['m1','m2','m3'], provenance: { sourceId: 'ca' }, transportability: { admissible: true }, uncertainty: { low: 18, high: 22 } } },
      b: { causal: { verified: true, evidenceType: 'causal', estimate: 8, unit: 'outcomes', uncertainty: { low: 7, high: 9 }, transportability: { admissible: true }, sourceId: 'cb' }, marginalResource: { intervention: 'b', resourceAmount: 10, resourceUnit: 'CAD', incrementalCapacity: 1, incrementalActivity: 1, incrementalOutcome: 8, capacityUnit: 'capacity', activityUnit: 'activity', unit: 'outcomes', evidenceId: 'n1', evidenceIds: ['n1','n2','n3'], provenance: { sourceId: 'cb' }, transportability: { admissible: true }, uncertainty: { low: 7, high: 9 } } }
    },
    budget: { amount: 10, unit: 'CAD' },
    voiValues: { a: 100, b: 50 }
  });
  assert.equal(result.sensitivity.status, 'ANALYZED');
  assert.equal(result.sensitivity.pointRecommendation, 'a');
  assert.equal(result.sensitivity.robust, true);
  assert.equal(result.recommendationReady, true);
});
