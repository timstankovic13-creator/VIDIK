'use strict';

const assert = require('node:assert/strict');
const { discoverTests, runOfflineTests } = require('../js/vidik-offline-test-runner');

const tests = discoverTests();
assert.ok(tests.length >= 1);
assert.equal(tests, [...tests].sort());

const result = runOfflineTests();
assert.equal(result.status, 'PASS');
assert.equal(result.discovered, tests.length);
assert.equal((result.counts.FAIL || 0), 0);
assert.ok((result.counts.PASS || 0) >= 1);
console.log(`PASS vidik-offline-test-runner (${result.discovered} discovered)`);
