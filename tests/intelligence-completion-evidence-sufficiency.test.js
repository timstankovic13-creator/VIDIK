'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { assessEvidenceSufficiency, deduplicateEvidenceLeads, sourceIsAuthoritative } = require('../js/source-driven-evidence-discovery');

test('evidence sufficiency requires independent usable sources and never grants recommendation authority', () => {
  const result = assessEvidenceSufficiency({ sourceSearches: [{ status: 'evidence-leads-found' }, { status: 'evidence-leads-found' }], evidenceLeads: [{ id: 'a', sourceId: 'openalex-works' }, { id: 'b', sourceId: 'pubmed-eutils' }] });
  assert.equal(result.evidenceComplete, true); assert.equal(result.independentSourceCount, 2); assert.equal(result.recommendationEligible, false); assert.equal(result.effectsImported, false);
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
