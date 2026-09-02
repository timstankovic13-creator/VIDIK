'use strict';

const assert = require('node:assert/strict');
const { runOfflineSystemCheck } = require('../js/vidik-offline-system-check');

const result = runOfflineSystemCheck();
assert.equal(result.status, 'PASS');
assert.equal(result.failed, 0);
assert.ok(result.passed >= 5);
console.log(`VIDIK offline system check passed: ${result.passed} checks`);
