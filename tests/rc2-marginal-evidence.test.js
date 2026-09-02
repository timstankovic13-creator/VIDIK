'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { REQUIRED, evaluateMarginalEvidence, buildEvidencePack } = require('../js/rc2-marginal-evidence');

describe('RC2 marginal evidence gate', () => {
  it('requires every marginal causal gate before promotion', () => {
    const result = evaluateMarginalEvidence({ candidateId: '002', evidence: {
      marginalExposure: { status: 'ADMISSIBLE' },
      counterfactual: { status: 'ADMISSIBLE' }
    }});
    assert.deepEqual(REQUIRED, ['marginalExposure', 'counterfactual', 'attribution', 'transportability']);
    assert.equal(result.status, 'BLOCKED');
    assert.deepEqual(result.missing, ['attribution', 'transportability']);
    assert.equal(result.recommendationAllowed, false);
  });

  it('does not mistake downstream outcome evidence for marginal causal identification', () => {
    const result = evaluateMarginalEvidence({ candidateId: '003', evidence: {
      outcome: { status: 'ADMISSIBLE' },
      systemOutcome: { status: 'ADMISSIBLE' },
      marginalExposure: { status: 'ADMISSIBLE' }
    }});
    assert.deepEqual(result.missing, ['counterfactual', 'attribution', 'transportability']);
    assert.equal(result.status, 'BLOCKED');
  });

  it('only permits promotion when all four marginal gates are admissible', () => {
    const evidence = Object.fromEntries(REQUIRED.map(stage => [stage, { status: 'ADMISSIBLE' }]));
    const result = evaluateMarginalEvidence({ candidateId: '004', evidence });
    assert.equal(result.status, 'PROMOTABLE_FOR_REVIEW');
    assert.equal(result.recommendationAllowed, true);
  });

  it('preserves historical and current-learning planes in the evidence pack', () => {
    const pack = buildEvidencePack([
      {
        candidateId: '002',
        historicalEvidence: { resource: '2023 program/resource record' },
        currentLearningEvidence: { speedCompliance: '16% -> 57% -> 69% -> 81%' },
        evidence: { marginalExposure: { status: 'ADMISSIBLE' } }
      }
    ]);
    assert.equal(pack[0].historicalBoundary, '2023-12-06');
    assert.equal(pack[0].currentLearningEvidence.speedCompliance, '16% -> 57% -> 69% -> 81%');
    assert.equal(pack[0].gate.status, 'BLOCKED');
  });
});
