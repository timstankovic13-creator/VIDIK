'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CASES, CHECKPOINTS, createExecutionRecord, recordAllocation, recordExposure, updateLearning } = require('../js/rc3-execution-records');
const { REQUIRED_GATES } = require('../js/rc3-execution-readiness');

const gates = Object.fromEntries(REQUIRED_GATES.map(g => [g, true]));

function blockedGates() { return { ...gates, authorizedAllocation: false, actualExposure: false }; }

for (const caseId of CASES) {
  test(`case ${caseId} has a fail-closed execution record without exposure`, () => {
    const record = createExecutionRecord({ caseId, decisionId: `DEC-${caseId}-PROSP-001`, originalDecisionHash: `hash-${caseId}`, gates: blockedGates() });
    assert.equal(record.readiness.status, 'BLOCKED');
    assert.equal(record.recommendationStatus, 'NO_RECOMMENDATION');
    assert.equal(record.historicalDecisionMutation, false);
    assert.deepEqual(record.learning.map(x => x.checkpoint), [...CHECKPOINTS]);
  });
}

test('allocation and exposure are recorded only through explicit execution steps', () => {
  let record = createExecutionRecord({ caseId: '003', decisionId: 'DEC-003-PROSP-001', originalDecisionHash: 'hash', gates: blockedGates() });
  assert.throws(() => recordAllocation(record, { authorized: false }), /authorized allocation/);
  record = recordAllocation(record, { authorized: true, quantity: 8, unit: 'crew-hours' });
  record = recordExposure(record, { recorded: true, quantity: 8, unit: 'crew-hours' });
  assert.equal(record.allocation.quantity, 8);
  assert.equal(record.exposure.quantity, 8);
  assert.equal(record.historicalDecisionMutation, false);
});

test('learning updates are checkpoint-bound and preserve other checkpoints', () => {
  let record = createExecutionRecord({ caseId: '011', decisionId: 'DEC-011-PROSP-001', originalDecisionHash: 'hash', gates });
  record = updateLearning(record, '6mo', { status: 'OBSERVED', predicted: 'directional', observed: 'measured' });
  assert.equal(record.learning[0].status, 'OBSERVED');
  assert.equal(record.learning[1].status, 'PENDING');
  assert.throws(() => updateLearning(record, '3mo', {}), /Invalid learning checkpoint/);
});
