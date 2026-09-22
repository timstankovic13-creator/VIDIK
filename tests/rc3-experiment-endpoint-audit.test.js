'use strict';

const assert = require('node:assert/strict');
const { ENDPOINT_AUDIT, getEndpointAudit, summarizeEndpointAudit, HISTORICAL_BOUNDARY, CHECKPOINTS } = require('../js/rc3-experiment-endpoint-audit');

const CASES = Object.keys(ENDPOINT_AUDIT);

assert.deepEqual(CASES, ['004','005','006','007','008','009','010','011','012','013','014']);
assert.equal(HISTORICAL_BOUNDARY, '2023-12-06');
assert.deepEqual(CHECKPOINTS, ['6mo', '1yr', '2yr', '5yr']);

for (const caseId of CASES) {
  const result = getEndpointAudit(caseId);
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.evidence, 'PUBLIC_EVIDENCE_LOCATED');
  assert.equal(result.exposure, 'UNVERIFIED');
  assert.equal(result.counterfactual, 'UNVERIFIED');
  assert.equal(result.measurement, 'UNVERIFIED');
  assert.equal(result.effectEstimate, null);
  assert.equal(result.roi, null);
  assert.equal(result.recommendation, null);
}

assert.throws(() => getEndpointAudit('001'), /Unsupported endpoint audit case/);

const summary = summarizeEndpointAudit();
assert.equal(summary.total, 11);
assert.equal(summary.blocked, 11);
assert.equal(summary.readyForEffectEstimation, 0);
assert.equal(summary.inconclusive, 0);
assert.equal(summary.recommendations, 0);

console.log('RC3 experiment endpoint audit: 11/11 cases independently BLOCKED; 0 promoted; 0 inconclusive; 0 recommendations manufactured.');
