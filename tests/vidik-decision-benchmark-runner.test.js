'use strict';
const assert = require('node:assert/strict');
const { runBenchmark } = require('../js/vidik-decision-benchmark-runner');
const result = runBenchmark();
assert.equal(result.total, 10);
assert.equal(result.passed, 10);
assert.equal(result.failed, 0);
assert.equal(result.productionPromotionCount, 0);
for (const row of result.results) {
  assert.equal(row.pass, true, row.id);
  assert.equal(row.productionRecommendation, null, row.id);
  assert.equal(row.effectEstimate, null, row.id);
  assert.equal(row.roi, null, row.id);
}
console.log('PASS — decision benchmark runner: 10/10 known answers, zero production promotion');
