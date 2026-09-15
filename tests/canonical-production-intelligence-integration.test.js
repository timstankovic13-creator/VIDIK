'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const PI = require('../js/vidik-production-intelligence');

const MODEL = {
  resourceUnit: 'CAD',
  capacityPerCad: 0.01,
  activityPerCapacity: 2,
  effectPerActivity: 0.5,
  objectiveMetric: 'avoided-incidents',
  capacityUnit: 'staff-capacity',
  activityUnit: 'service-contacts',
  effectUnit: 'avoided-incidents',
  evidenceIds: ['E-causal', 'E-resource', 'E-implementation'],
  uncertainty: { low: 0.3, high: 0.7 }
};

function score(values) {
  const effect = Number(values.effect);
  const risk = Number(values.risk);
  const housing = effect - risk;
  const alternate = 0.30;
  return housing >= alternate
    ? { recommendation: 'housing', score: housing }
    : { recommendation: 'alternate', score: alternate };
}

test('canonical production certification uses the existing optimizer and decision-intelligence engine', () => {
  const result = PI.validateCanonicalDecisionIntegration({
    resourceEnvelope: { marginalUnit: { amount: 100000, unit: 'CAD' } },
    interventionComparison: [
      { id: 'housing', name: 'Housing intervention', status: 'ADMISSIBLE' },
      { id: 'alternate', name: 'Alternate intervention', status: 'ADMISSIBLE' }
    ],
    resourceModels: {
      housing: MODEL,
      alternate: { ...MODEL, capacityPerCad: 0.008, effectPerActivity: 0.4 }
    },
    baseline: { effect: 0.42, risk: 0.10 },
    parameters: [
      { id: 'effect', low: 0.20, mean: 0.42, high: 0.60 },
      { id: 'risk', low: 0.05, mean: 0.10, high: 0.20 }
    ],
    correlations: [{ a: 'effect', b: 'risk', rho: 0.25 }],
    scoreFn: score,
    voiCandidates: [{
      id: 'effect', currentValue: 0.20, lowValue: 0.05, highValue: 0.70,
      pHigh: 0.5, cost: 0.02, lowRecommendation: 'alternate', highRecommendation: 'housing'
    }],
    decisionValue: 1,
    sensitivitySteps: 11,
    uncertaintySamples: 500
  });

  assert.equal(result.optimizer.status, 'OPTIMIZED');
  assert.equal(result.optimizer.allocation.intervention, 'housing');
  assert.equal(result.analysisValid, true);
  assert.equal(result.optimizerValid, true);
  assert.equal(result.decisionIntelligence.version, '9.7.1');
  assert.equal(result.validated, true);
  assert.equal(result.integrationHash.length, 64);
});

test('canonical production certification fails closed on optimizer evidence-lineage defects', () => {
  const result = PI.validateCanonicalDecisionIntegration({
    resourceEnvelope: { marginalUnit: { amount: 1000, unit: 'CAD' } },
    interventionComparison: [{ id: 'bad', name: 'Bad lineage', status: 'ADMISSIBLE' }],
    resourceModels: { bad: { ...MODEL, evidenceIds: ['E1', 'E1', 'E2'] } },
    baseline: { effect: 0.42, risk: 0.10 },
    parameters: [{ id: 'effect', low: 0.20, mean: 0.42, high: 0.60 }],
    scoreFn: score,
    sensitivitySteps: 5,
    uncertaintySamples: 100
  });

  assert.equal(result.optimizer.status, 'BLOCKED');
  assert.equal(result.validated, false);
  assert.equal(result.optimizerValid, false);
});
