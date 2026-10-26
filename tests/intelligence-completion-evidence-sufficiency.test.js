'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { assessEvidenceSufficiency, deduplicateEvidenceLeads, sourceIsAuthoritative } = require('../js/source-driven-evidence-discovery');

test('evidence sufficiency requires independent usable sources and never grants recommendation authority', () => {
  const result = assessEvidenceSufficiency({ sourceSearches: [{ status: 'evidence-leads-found' }, { status: 'evidence-leads-found' }], evidenceLeads: [{ id: 'a', sourceId: 'openalex-works', relevanceStatus: 'candidate-match' }, { id: 'b', sourceId: 'pubmed-eutils', relevanceStatus: 'candidate-match' }] });
  assert.equal(result.evidenceComplete, true); assert.equal(result.independentSourceCount, 2); assert.equal(result.recommendationEligible, false); assert.equal(result.effectsImported, false);
});

test('discovery leads are not mislabeled as decision-grade evidence', () => {
  const result = assessEvidenceSufficiency({
    sourceSearches: [{ status: 'evidence-leads-found' }, { status: 'evidence-leads-found' }],
    evidenceLeads: [
      { id: 'a', sourceId: 'openalex-works', relevanceStatus: 'candidate-match' },
      { id: 'b', sourceId: 'pubmed-eutils', relevanceStatus: 'candidate-match' }
    ]
  });
  assert.equal(result.discoverySufficient, true);
  assert.equal(result.evidenceComplete, true); // Legacy field means discovery sufficiency only.
  assert.equal(result.decisionGradeEvidenceComplete, false);
  assert.deepEqual(result.decisionGradeEvidence.missingEvidence, ['causal', 'implementation', 'cost', 'equity']);
  assert.equal(result.recommendationEligible, false);
});

test('decision-grade evidence requires verified, traceable evidence for every required category', () => {
  const { assessDecisionGradeEvidence } = require('../js/source-driven-evidence-discovery');
  const base = (type, sourceId) => ({
    id: type, type, verified: true, sourceId, externalId: `record-${type}`,
    sourceUrl: `https://example.org/${type}`, targetJurisdiction: 'Ottawa, Canada'
  });
  const result = assessDecisionGradeEvidence({
    targetJurisdiction: 'Ottawa, Canada',
    verifiedEvidence: [
      base('causal', 'openalex-works'),
      base('implementation', 'pubmed-eutils'),
      base('cost', 'crossref-works'),
      base('equity', 'openalex-works')
    ]
  });
  assert.equal(result.complete, true);
  assert.deepEqual(result.missingEvidence, []);
  assert.equal(result.recommendationEligible, false);
  assert.equal(result.effectsImported, false);
});

test('decision-grade evidence rejects unverified records and jurisdiction mismatches', () => {
  const { assessDecisionGradeEvidence } = require('../js/source-driven-evidence-discovery');
  const result = assessDecisionGradeEvidence({
    targetJurisdiction: 'Ottawa, Canada',
    verifiedEvidence: [{
      id: 'causal-1', type: 'causal', verified: false, sourceId: 'openalex-works',
      externalId: 'W1', sourceUrl: 'https://example.org/W1', targetJurisdiction: 'New York, USA'
    }]
  });
  assert.equal(result.complete, false);
  assert.deepEqual(result.missingEvidence, ['causal', 'implementation', 'cost', 'equity']);
  assert.ok(result.rejectedEvidence[0].reasons.includes('independent-verification-not-confirmed'));
  assert.ok(result.rejectedEvidence[0].reasons.includes('target-jurisdiction-mismatch'));
});

test('partial evidence outage is explicit and failure-closed', () => {
  const result = assessEvidenceSufficiency({ sourceSearches: [{ status: 'evidence-leads-found' }, { status: 'search-failed' }], evidenceLeads: [{ id: 'a', sourceId: 'openalex-works' }] });
  assert.equal(result.evidenceComplete, false); assert.equal(result.stoppingReason, 'partial-evidence-source-failure'); assert.equal(result.recommendationEligible, false);
});

test('duplicate evidence records collapse and untrusted effects are stripped', () => {
  const leads = deduplicateEvidenceLeads([{ id: 'evidence:openalex-works:x', sourceId: 'openalex-works', causalEffect: 99 }, { id: 'evidence:openalex-works:x', sourceId: 'openalex-works', estimatedImpact: 999 }]);
  assert.equal(leads.length, 1); assert.equal(Object.hasOwn(leads[0], 'causalEffect'), false); assert.equal(Object.hasOwn(leads[0], 'estimatedImpact'), false); assert.equal(leads[0].causalEffectImported, false);
});

test('caller cannot spoof an evidence source into authority', () => {
  // OpenAlex is registered as an international source. Authority follows the
  // canonical registry jurisdiction; a caller cannot relabel it as US evidence.
  assert.equal(sourceIsAuthoritative({ sourceId: 'openalex-works', jurisdiction: 'international' }), true);
  assert.equal(sourceIsAuthoritative({ sourceId: 'openalex-works', jurisdiction: 'US' }), false);
  assert.equal(sourceIsAuthoritative({ sourceId: 'unknown', jurisdiction: 'CA' }), false);
});
