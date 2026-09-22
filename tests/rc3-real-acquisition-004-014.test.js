'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { ACQUISITION, getAcquisition, evaluateAcquisition, CHECKPOINTS, HISTORICAL_BOUNDARY } = require('../js/rc3-real-acquisition-004-014');

const CASE_IDS = Object.keys(ACQUISITION);

assert.deepEqual(CASE_IDS, ['004','005','006','007','008','009','010','011','012','013','014']);

for (const caseId of CASE_IDS) {
  test(`case ${caseId}: acquisition attempt is real but remains fail-closed without exposure`, () => {
    const result = getAcquisition(caseId);
    assert.equal(result.evidenceStatus, 'EVIDENCE_LOCATED');
    assert.equal(result.exposureStatus, 'EXPOSURE_UNVERIFIED');
    assert.equal(result.promotionStatus, 'BLOCKED_PENDING_ACTUAL_EXPOSURE_AND_COUNTERFACTUAL');
    assert.ok(result.sourceLeads.length > 0);
    assert.ok(result.acquisitionTarget);
    assert.ok(result.blocker);
    assert.equal(result.historicalBoundary, HISTORICAL_BOUNDARY);
    assert.deepEqual(result.checkpoints, CHECKPOINTS);
    assert.equal(result.effectEstimate, null);
    assert.equal(result.roi, null);
    assert.equal(result.recommendation, null);
  });
}

test('no case promotes without all execution gates', () => {
  for (const caseId of CASE_IDS) {
    const blocked = evaluateAcquisition(caseId, { authorizedAllocation: true, actualExposure: false, admissibleEvidence: true, defensibleCounterfactual: true, measurementReady: true });
    assert.equal(blocked.promotionStatus, 'BLOCKED_PENDING_EXECUTION_GATES');
  }
});

test('all execution gates permit effect-estimation readiness without manufacturing an effect', () => {
  for (const caseId of CASE_IDS) {
    const ready = evaluateAcquisition(caseId, { authorizedAllocation: true, actualExposure: true, admissibleEvidence: true, defensibleCounterfactual: true, measurementReady: true });
    assert.equal(ready.promotionStatus, 'READY_FOR_EFFECT_ESTIMATION');
    assert.equal(ready.effectEstimate, null);
    assert.equal(ready.roi, null);
    assert.equal(ready.recommendation, null);
  }
});
