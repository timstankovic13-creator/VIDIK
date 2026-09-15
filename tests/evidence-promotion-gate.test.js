'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const Gate = require('../js/evidence-promotion-gate');

function lead(overrides = {}) {
  return {
    id: 'evidence:openalex-works:W1',
    candidateId: 'universe:abc',
    sourceId: 'openalex-works',
    evidenceLeadOnly: true,
    causalEffectImported: false,
    provenance: { externalId: 'W1' },
    ...overrides
  };
}

function verification(overrides = {}) {
  return {
    verified: true,
    verificationId: 'independent:W1:v1',
    sourceId: 'openalex-works',
    externalId: 'W1',
    evidenceType: 'causal',
    sourceJurisdiction: 'international',
    targetJurisdiction: 'Ottawa, Canada',
    localEvidenceBoundary: 'explicit',
    transportability: { admissible: true },
    verifiedEvidence: ['causal', 'implementation', 'cost', 'equity'],
    parameter: { estimate: 0.42, unit: 'risk ratio', uncertainty: { low: 0.31, high: 0.56 } },
    ...overrides
  };
}

test('verified causal parameter can cross the evidence gate but not recommendation eligibility', () => {
  const result = Gate.promoteVerifiedParameter({ lead: lead(), verification: verification(), targetJurisdiction: 'Ottawa, Canada' });
  assert.equal(result.eligible, true);
  assert.equal(result.recommendationEligible, false);
  assert.equal(result.verifiedParameter.parameter.estimate, 0.42);
  assert.equal(result.effectsImported, false);
});

test('discovery lead without independent verification remains blocked', () => {
  const result = Gate.promoteVerifiedParameter({ lead: lead(), targetJurisdiction: 'Ottawa, Canada' });
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.includes('independent-verification-missing'));
  assert.equal(result.verifiedParameter, null);
});

test('source or external-record mismatch cannot promote a discovered lead', () => {
  const result = Gate.promoteVerifiedParameter({ lead: lead(), verification: verification({ externalId: 'W2' }), targetJurisdiction: 'Ottawa, Canada' });
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.includes('verification-source-mismatch'));
});

test('missing uncertainty or incomparable units cannot promote a parameter', () => {
  const result = Gate.promoteVerifiedParameter({ lead: lead(), verification: verification({ parameter: { estimate: 0.42, unit: '', uncertainty: { low: 0.31, high: null } } }), targetJurisdiction: 'Ottawa, Canada' });
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.includes('parameter-unit-missing'));
  assert.ok(result.reasons.includes('parameter-uncertainty-missing-or-invalid'));
});

test('transportability and local-evidence boundary are mandatory', () => {
  const result = Gate.promoteVerifiedParameter({ lead: lead(), verification: verification({ transportability: { admissible: false }, localEvidenceBoundary: 'implicit' }), targetJurisdiction: 'Ottawa, Canada' });
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.includes('transportability-not-admissible'));
  assert.ok(result.reasons.includes('local-evidence-boundary-not-explicit'));
});

test('imported effect is never accepted as independent verification', () => {
  const result = Gate.promoteVerifiedParameter({ lead: lead({ causalEffectImported: true }), verification: verification(), targetJurisdiction: 'Ottawa, Canada' });
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.includes('effect-already-imported'));
});

test('source-driven discovery remains lead-only until an exact verification is supplied', () => {
  const discovery = {
    schemaVersion: 'vidik.source-driven-evidence-discovery.v2',
    candidateId: 'universe:abc',
    discoveryHash: 'discovery-1',
    evidenceLeads: [lead()]
  };
  const result = Gate.promoteDiscoveredEvidence({ discovery, targetJurisdiction: 'Ottawa, Canada' });
  assert.equal(result.leadCount, 1);
  assert.equal(result.promotedCount, 0);
  assert.equal(result.blockedCount, 1);
  assert.equal(result.recommendationEligible, false);
  assert.ok(result.blocked[0].reasons.includes('independent-verification-missing'));
});

test('exactly verified discovery lead can promote its parameter without importing an effect or recommendation', () => {
  const discovery = {
    schemaVersion: 'vidik.source-driven-evidence-discovery.v2',
    candidateId: 'universe:abc',
    discoveryHash: 'discovery-2',
    evidenceLeads: [lead()]
  };
  const result = Gate.promoteDiscoveredEvidence({
    discovery,
    targetJurisdiction: 'Ottawa, Canada',
    verificationByEvidenceId: { [lead().id]: verification() }
  });
  assert.equal(result.promotedCount, 1);
  assert.equal(result.blockedCount, 0);
  assert.equal(result.promotions[0].candidateId, 'universe:abc');
  assert.equal(result.promotions[0].parameter.estimate, 0.42);
  assert.equal(result.recommendationEligible, false);
  assert.equal(result.effectsImported, false);
});

test('verification for a different discovered lead cannot cross the promotion boundary', () => {
  const discovery = {
    schemaVersion: 'vidik.source-driven-evidence-discovery.v2',
    candidateId: 'universe:abc',
    discoveryHash: 'discovery-3',
    evidenceLeads: [lead()]
  };
  const result = Gate.promoteDiscoveredEvidence({
    discovery,
    targetJurisdiction: 'Ottawa, Canada',
    verificationByEvidenceId: { 'evidence:openalex-works:OTHER': verification({ externalId: 'OTHER' }) }
  });
  assert.equal(result.promotedCount, 0);
  assert.equal(result.blockedCount, 1);
  assert.ok(result.blocked[0].reasons.includes('independent-verification-missing'));
});
