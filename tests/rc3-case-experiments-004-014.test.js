'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const registry = require('../js/rc3-case-registry-004-014');

describe('RC3 Cases 004-014 execution registry', () => {
  it('instantiates every remaining case without promoting a recommendation', () => {
    assert.equal(registry.cases.length, 11);
    for (const c of registry.cases) {
      assert.equal(c.historicalDecisionHash, registry.HISTORICAL_HASH);
      assert.equal(c.recommendation, 'NO RECOMMENDATION');
      assert.ok(c.marginalUnit);
      assert.ok(c.blocker);
    }
  });

  it('keeps the entire 004-014 batch fail-closed until execution evidence exists', () => {
    const result = registry.validateCaseRegistry();
    assert.equal(result.caseCount, 11);
    assert.equal(result.eligible, false);
    assert.deepEqual(result.failures, []);
  });

  it('does not allow current prospective cases to rewrite the historical hash', () => {
    const anchor = registry.getCase('006');
    assert.equal(anchor.status, 'PROSPECTIVE_ONLY');
    assert.equal(anchor.historicalDecisionHash, registry.HISTORICAL_HASH);
    assert.equal(anchor.recommendation, 'NO RECOMMENDATION');
  });
});
