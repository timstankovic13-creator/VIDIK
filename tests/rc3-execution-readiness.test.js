'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateExecutionReadiness, buildExecutionRecord, REQUIRED_GATES } = require('../js/rc3-execution-readiness');

const complete = Object.fromEntries(REQUIRED_GATES.map(g => [g, true]));

 test('blocks effect estimation when authorized allocation and exposure are absent', () => {
  const result = evaluateExecutionReadiness({ ...complete, authorizedAllocation: false, actualExposure: false });
  assert.equal(result.ready, false);
  assert.deepEqual(result.blockers, ['authorized-allocation-missing', 'actual-exposure-missing']);
  assert.equal(result.status, 'BLOCKED');
});

test('blocks on any missing evidence or counterfactual gate', () => {
  const result = evaluateExecutionReadiness({ ...complete, admissibleEvidence: false, defensibleCounterfactual: false });
  assert.equal(result.ready, false);
  assert.deepEqual(result.blockers, ['admissible-evidence-missing', 'defensible-counterfactual-missing']);
});

test('requires boolean values for every gate', () => {
  assert.throws(() => evaluateExecutionReadiness({ ...complete, actualExposure: null }), /actualExposure must be boolean/);
  assert.throws(() => evaluateExecutionReadiness({ ...complete, contractComplete: 1 }), /contractComplete must be boolean/);
});

test('only a complete execution state becomes ready for effect estimation', () => {
  const result = evaluateExecutionReadiness(complete);
  assert.deepEqual(result, { ready: true, status: 'READY_FOR_EFFECT_ESTIMATION', blockers: [] });
});

test('execution record remains fail-closed without real exposure', () => {
  const record = buildExecutionRecord({
    caseId: '003',
    decisionId: 'DEC-003-PROSP-001',
    originalDecisionHash: 'historical-hash',
    gates: { ...complete, authorizedAllocation: true, actualExposure: false },
    allocation: null,
    exposure: null
  });
  assert.equal(record.readiness.status, 'BLOCKED');
  assert.equal(record.recommendationStatus, 'NO_RECOMMENDATION');
  assert.equal(record.historicalDecisionMutation, false);
});

test('complete record can become eligible without manufacturing a recommendation', () => {
  const record = buildExecutionRecord({
    caseId: '011',
    decisionId: 'DEC-011-PROSP-001',
    originalDecisionHash: 'historical-hash',
    gates: complete,
    allocation: { authorized: true, quantity: 1, unit: 'crew-hours' },
    exposure: { recorded: true, quantity: 1 },
    evidence: [{ sourceId: 'candidate-source', admissible: true }],
    counterfactual: { method: 'quasi-experimental' },
    measurement: { ready: true }
  });
  assert.equal(record.readiness.status, 'READY_FOR_EFFECT_ESTIMATION');
  assert.equal(record.recommendationStatus, 'ELIGIBLE_FOR_EFFECT_ESTIMATION');
  assert.equal(record.originalDecisionHash, 'historical-hash');
});
