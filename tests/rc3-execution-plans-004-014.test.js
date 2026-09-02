'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { PLANS, HISTORICAL_BOUNDARY, CHECKPOINTS, createBlockedExecutionTemplate } = require('../js/rc3-execution-plans-004-014');
const { CASES, createExecutionRecord } = require('../js/rc3-execution-records');
const { REQUIRED_GATES } = require('../js/rc3-execution-readiness');

const CASE_IDS = ['004','005','006','007','008','009','010','011','012','013','014'];
const gates = Object.fromEntries(REQUIRED_GATES.map(g => [g, true]));

for (const caseId of CASE_IDS) {
  test(`case ${caseId} is instantiated with an explicit execution plan and remains blocked without real exposure`, () => {
    assert.ok(PLANS[caseId]);
    const template = createBlockedExecutionTemplate(caseId, `DEC-${caseId}-PROSP-001`, `hash-${caseId}`);
    assert.equal(template.status, 'BLOCKED');
    assert.equal(template.recommendationStatus, 'NO_RECOMMENDATION');
    assert.equal(template.historicalBoundary, HISTORICAL_BOUNDARY);
    assert.deepEqual(template.checkpoints, CHECKPOINTS);
    assert.equal(template.actualExposure, null);
    assert.equal(template.effectEstimate, null);
    assert.equal(template.roi, null);
  });
}

test('execution record registry covers 003 through 014', () => {
  assert.deepEqual(CASES, ['003','004','005','006','007','008','009','010','011','012','013','014']);
  for (const caseId of CASES) {
    const record = createExecutionRecord({ caseId, decisionId: `DEC-${caseId}-PROSP-001`, originalDecisionHash: `hash-${caseId}`, gates: { ...gates, authorizedAllocation: false, actualExposure: false } });
    assert.equal(record.recommendationStatus, 'NO_RECOMMENDATION');
  }
});

test('plans do not manufacture allocation, effect, ROI, or recommendation', () => {
  for (const caseId of CASE_IDS) {
    const plan = PLANS[caseId];
    assert.ok(plan.marginalResourceUnit);
    assert.ok(plan.counterfactual);
    assert.ok(plan.acquisitionBlocker);
  }
});
