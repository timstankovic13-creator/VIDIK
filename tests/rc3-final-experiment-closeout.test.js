'use strict';

const assert = require('node:assert/strict');
const { CASES, closeout, HISTORICAL_BOUNDARY, CHECKPOINTS } = require('../js/rc3-final-experiment-closeout');

const result = closeout();
assert.equal(HISTORICAL_BOUNDARY, '2023-12-06');
assert.deepEqual(CHECKPOINTS, ['6mo', '1yr', '2yr', '5yr']);
assert.equal(result.status, 'EXPERIMENT_CLOSED_AT_PUBLIC_ACQUISITION_BOUNDARY');
assert.equal(result.totalCases, 12);
assert.equal(result.promoted, 0);
assert.equal(result.blocked, 12);
assert.equal(result.inconclusive, 0);
assert.equal(result.recommendations, 0);

for (const caseId of Object.keys(CASES)) {
  const c = result.cases.find(x => x.caseId === caseId);
  assert.ok(c);
  assert.equal(c.effectEstimate, null);
  assert.equal(c.roi, null);
  assert.equal(c.recommendation, null);
  assert.ok(c.missing.length >= 2);
}

console.log('RC3 final experiment closeout: 12/12 cases blocked at the public-acquisition boundary; 0 promoted; 0 inconclusive; 0 recommendations.');
