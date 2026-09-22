'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { buildEvidenceDiscoveryRequest, classifyEvidenceCoverage } = require('../js/evidence-discovery-gateway');

const candidate = { id: 'source:crime:1', name: 'Community violence interruption', requiredEvidence: ['causal', 'implementation', 'cost', 'equity'] };

test('unseen candidate produces candidate-specific evidence requests without importing effects', () => {
  const request = buildEvidenceDiscoveryRequest({ problem: 'reduce violent crime', candidate, jurisdiction: 'Canada' });
  assert.equal(request.effectsImported, false);
  assert.equal(request.recommendationEligible, false);
  assert.equal(request.queries.length, 4);
  assert.ok(request.queries.every(query => query.candidateId === candidate.id && query.discoveryOnly));
  assert.match(request.requestHash, /^[a-f0-9]{64}$/);
});

test('missing or blocked evidence is never treated as zero', () => {
  const coverage = classifyEvidenceCoverage({ candidate, evidence: { causal: { status: 'blocked' }, implementation: { status: 'supported' } } });
  assert.equal(coverage.recommendationEligible, false);
  assert.ok(coverage.missing.includes('causal'));
  assert.ok(coverage.missing.includes('cost'));
});

test('recommendation requires independently supported coverage of every required evidence dimension', () => {
  const evidence = Object.fromEntries(candidate.requiredEvidence.map(type => [type, { status: 'supported', sourceIds: [`${type}-source`], causalIdentified: type === 'causal' }]));
  const coverage = classifyEvidenceCoverage({ candidate, evidence });
  assert.equal(coverage.recommendationEligible, true);
});
