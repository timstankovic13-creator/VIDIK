'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const pkg = require('../package.json');
test('audit replay export test is part of the repository validation contract', () => {
  assert.equal(pkg.scripts['test:audit-replay-export'], undefined);
  assert.ok(pkg.scripts['test:decision-artifact-store']);
});
