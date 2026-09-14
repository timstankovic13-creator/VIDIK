'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { assessInterventionSourceApplicability } = require('../js/intervention-source-applicability');

test('arbitrary unseen problem never becomes an unsearched source universe', () => {
  const result = assessInterventionSourceApplicability({ problem: 'reduce violent crime' });
  assert.equal(result.noApplicableSource, false);
  assert.equal(result.fallbackApplied, true);
  assert.ok(result.sourcesSelected.length > 0);
  assert.equal(result.searchRequired, true);
  assert.ok(result.sourcesConsidered.length >= result.sourcesSelected.length);
});

test('jurisdiction filtering remains explicit and auditable', () => {
  const result = assessInterventionSourceApplicability({ problem: 'unexpected emerging municipal problem', jurisdiction: 'Canada' });
  assert.equal(result.fallbackApplied, true);
  assert.ok(result.decisions.some(item => item.reason === 'jurisdiction-mismatch'));
  assert.ok(result.sourcesSelected.every(id => result.decisions.find(item => item.sourceId === id)?.selected));
});

test('empty problem is rejected rather than silently searching broadly', () => {
  assert.throws(() => assessInterventionSourceApplicability({ problem: '   ' }), /source-applicability-problem-required/);
});
