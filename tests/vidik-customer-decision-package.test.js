'use strict';

const assert = require('node:assert/strict');
const { buildCustomerDecisionPackage } = require('../js/vidik-customer-decision-package');

const blocked = buildCustomerDecisionPackage({ decision: { status: 'NO_RECOMMENDATION', recommendation: 'allocate' } });
assert.equal(blocked.decision.recommendation, null);
assert.match(blocked.answer, /^NO RECOMMENDATION:/);

const ready = buildCustomerDecisionPackage({
  decision: { id: 'D-1', status: 'RECOMMENDATION_READY', recommendation: 'allocate', objective: 'reduce harm', decisionDate: '2026-09-02' },
  reasoning: { why: 'higher expected benefit', whyNot: 'status quo has lower expected benefit', assumptions: ['stable demand'] },
  evidence: [{ id: 'E1', quality: 'high' }],
  tradeoffs: ['cost', 'equity'],
  uncertainty: { level: 'medium', limitations: ['limited follow-up'], sensitivity: 'moderate' },
  audit: { snapshotHash: 'abc', override: false, history: ['created'] }
});
assert.equal(ready.decision.recommendation, 'allocate');
assert.equal(ready.reasoning.assumptions.length, 1);
assert.equal(ready.evidence.length, 1);
assert.equal(ready.audit.snapshotHash, 'abc');

assert.throws(() => buildCustomerDecisionPackage(null), /input must be an object/);
console.log('PASS vidik-customer-decision-package');
