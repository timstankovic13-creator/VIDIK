const assert = require('node:assert/strict');
const { benchmark, scoreRun } = require('../js/vidik-decision-benchmark-v1');

const blocked = { firstAnswerMs: 800, defensibleAnswerMs: 2400, auditCompleteness: 1, humanCorrectionRate: 0, reproducible: true, status: 'NO_RECOMMENDATION', effectEstimate: null, roi: null };
const recommended = { firstAnswerMs: 1200, defensibleAnswerMs: 4200, auditCompleteness: 1, humanCorrectionRate: 0.1, reproducible: true, status: 'RECOMMENDATION', effectEstimate: 0.12, roi: 1.8 };

assert.equal(scoreRun(blocked).appropriatelyBlocked, true);
assert.equal(scoreRun(recommended).appropriatelyBlocked, false);
const result = benchmark([blocked, recommended]);
assert.equal(result.n, 2);
assert.equal(result.p50FirstAnswerMs, 1000);
assert.equal(result.reproducible, true);
assert.equal(result.appropriateBlockRate, 0.5);
console.log('VIDIK Decision Benchmark v1 tests passed');
