'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Hardening = require('../js/vidik-trustworthiness-hardening');
const Resource = require('../js/vidik-resource-optimization');

const evidence = {
  e1: { status: 'verified', jurisdiction: 'CA', retrievedAt: '2026-09-01T00:00:00Z' },
  e2: { status: 'verified', jurisdiction: 'CA', retrievedAt: '2026-09-01T00:00:00Z' },
  stale: { status: 'verified', jurisdiction: 'CA', retrievedAt: '2020-01-01T00:00:00Z' },
  weak: { status: 'potential', jurisdiction: 'CA', retrievedAt: '2026-09-01T00:00:00Z' },
  us: { status: 'verified', jurisdiction: 'US', retrievedAt: '2026-09-01T00:00:00Z' }
};

test('1 evidence quality is trusted metadata, not caller assertion', () => {
  const result = Hardening.evidenceIntegrity({ evidenceIds: ['weak'], evidenceIndex: evidence, jurisdiction: 'CA' });
  assert.equal(result.admissible, false);
  assert.match(result.failures.join('|'), /not-trusted/);
});

test('2 duplicate evidence identifiers are rejected', () => {
  const result = Hardening.canonicalEvidenceIds(['e1', 'e1']);
  assert.equal(result.valid, false);
  assert.equal(result.reason, 'duplicate-evidence-ids');
});

test('3 stale evidence is an actual admissibility failure', () => {
  const result = Hardening.evidenceIntegrity({ evidenceIds: ['stale'], evidenceIndex: evidence, jurisdiction: 'CA', now: Date.parse('2026-09-13T00:00:00Z'), maxAgeDays: 365 });
  assert.equal(result.admissible, false);
  assert.match(result.failures.join('|'), /evidence-stale/);
});

test('4 missing evidence fails closed', () => {
  const result = Hardening.evidenceIntegrity({ evidenceIds: ['missing'], evidenceIndex: evidence, jurisdiction: 'CA' });
  assert.equal(result.admissible, false);
  assert.match(result.failures.join('|'), /evidence-not-found/);
});

test('5 unit/currency mismatch blocks resource optimization', () => {
  const result = Resource.evaluateResourceOptimization({ marginalUnit: { amount: 100, unit: 'CAD' } }, [{ id: 'x', name: 'X', status: 'ADMISSIBLE' }], {
    x: { capacityPerCad: 1, activityPerCapacity: 1, effectPerActivity: 1, objectiveMetric: 'jobs', resourceUnit: 'USD', evidenceIds: ['e1', 'e2', 'e3'] }
  }, { evidenceIndex: { e1: evidence.e1, e2: evidence.e2, e3: evidence.e1 }, jurisdiction: 'CA' });
  assert.equal(result.status, 'BLOCKED');
  assert.match(result.candidates[0].failures.join('|'), /resource-unit-mismatch/);
});

test('6 human override is explicit, authorized, reasoned and hashed', () => {
  const blocked = Hardening.humanOverrideDecision({ requested: true, allowed: false, actor: 'a', reason: 'r' });
  assert.equal(blocked.applied, false);
  const applied = Hardening.humanOverrideDecision({ requested: true, allowed: true, actor: 'operator-1', reason: 'Documented local implementation constraint.' });
  assert.equal(applied.applied, true);
  assert.match(applied.auditHash, /^[a-f0-9]{64}$/);
});

test('7 partial source outage preserves available results and marks partial', () => {
  const result = Hardening.normalizeSourceOutage([{ id: 'ottawa', status: 'available' }, { id: 'melbourne', status: 'search-failed' }]);
  assert.equal(result.status, 'PARTIAL');
  assert.equal(result.available.length, 1);
  assert.equal(result.failed.length, 1);
  assert.equal(result.preserveAvailableResults, true);
});

test('8 transferability requires multi-dimensional similarity and never imports effects', () => {
  const result = Hardening.transferabilityAssessment({ localJurisdiction: 'CA', comparableJurisdiction: 'US', similarity: { problem: .9, population: .9, institution: .8, resource: .8, policy: .7, context: .9 } });
  assert.equal(result.transferability, 'LEAD');
  assert.equal(result.effectsImported, false);
  assert.equal(result.causalEffectAdmissible, false);
});

test('9 wrong-jurisdiction evidence is independently rejected', () => {
  const result = Hardening.evidenceIntegrity({ evidenceIds: ['us'], evidenceIndex: evidence, jurisdiction: 'CA' });
  assert.equal(result.admissible, false);
  assert.match(result.failures.join('|'), /wrong-jurisdiction/);
});

test('resource chain accepts matching currency but still requires trusted lineage when an evidence index is supplied', () => {
  const result = Resource.evaluateResourceOptimization({ marginalUnit: { amount: 100, unit: 'CAD' } }, [{ id: 'x', name: 'X', status: 'ADMISSIBLE' }], {
    x: { capacityPerCad: 1, activityPerCapacity: 1, effectPerActivity: 2, objectiveMetric: 'jobs', evidenceIds: ['e1', 'e2', 'e3'], resourceUnit: 'CAD' }
  }, { evidenceIndex: { e1: evidence.e1, e2: evidence.e2, e3: evidence.e1 }, jurisdiction: 'CA' });
  assert.equal(result.status, 'OPTIMIZED');
  assert.equal(result.allocation.intervention, 'x');
});
