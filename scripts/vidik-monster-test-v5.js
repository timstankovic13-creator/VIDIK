'use strict';

const assert = require('node:assert/strict');
const G = require('../js/vidik-arbitrary-decision-governance');

const CASES = [
  { name: 'valid-admissible', expect: 'PASS', candidate: { id: 'c1', name: 'Validated program', requiredEvidence: ['causal','implementation'], discovery: { provenance: [{ sourceId: 's1' }] } }, evidence: { causal: { status: 'verified', causal: true, independentSource: true }, implementation: { status: 'verified', independentSource: true } }, analysisInputs: { estimate: 10 } },
  { name: 'missing-causal', expect: 'BLOCKED', candidate: { id: 'c2', name: 'Missing causal', requiredEvidence: ['causal','implementation'], discovery: { provenance: [{ sourceId: 's1' }] } }, evidence: { implementation: { status: 'verified', independentSource: true } }, analysisInputs: { estimate: 10 } },
  { name: 'stale-evidence', expect: 'BLOCKED', candidate: { id: 'c3', name: 'Stale program', requiredEvidence: ['causal'], discovery: { provenance: [{ sourceId: 's1' }] } }, evidence: { causal: { status: 'verified', freshness: { stale: true }, independentSource: true } }, analysisInputs: { estimate: 10 } },
  { name: 'learning-lead-cannot-be-recommendation', expect: 'BLOCKED', candidate: { id: 'c4', name: 'Learning lead', requiredEvidence: ['causal'], discovery: { leadOnly: true, provenance: [{ sourceId: 'learning' }] } }, evidence: { causal: { status: 'verified', causal: true, independentSource: true } }, analysisInputs: { estimate: 10 } },
  { name: 'failed-universe-source', expect: 'BLOCKED', candidate: { id: 'c5', name: 'Partial universe', requiredEvidence: ['causal'], discovery: { provenance: [{ sourceId: 's1' }] } }, evidence: { causal: { status: 'verified', causal: true, independentSource: true } }, analysisInputs: { estimate: 10 }, forceFailure: true }
];

for (const item of CASES) {
  const universe = G.buildCandidateUniverseIntelligence({ candidates: [item.candidate], sourceSearches: item.forceFailure ? [{ sourceId: 's2', status: 'search-failed', failureReason: 'upstream failure' }] : [{ sourceId: 's1', status: 'candidates-found'}], statusQuo: { explicit: true } });
  const verification = G.verifyEvidenceBundle({ candidate: item.candidate, evidence: item.evidence });
  const recommendationAllowed = verification.verified && universe.sufficientForRecommendation && !item.candidate.discovery?.leadOnly && Number.isFinite(item.analysisInputs?.estimate);
  const status = recommendationAllowed ? 'PASS' : 'BLOCKED';
  assert.equal(status, item.expect, item.name);
}

console.log(`VIDIK Monster v5 PASS: ${CASES.length}/${CASES.length} governance cases`);
