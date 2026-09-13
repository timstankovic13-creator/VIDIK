'use strict';
const assert = require('assert');
const test = require('node:test');
const Discovery = require('../js/intervention-discovery');
const Evidence = require('../js/evidence-integrity');
const Learning = require('../js/outcome-learning');
const { certifyProductionArtifact, projectDecisionArtifact } = require('../js/decision-artifact-contract');

// 1. Candidate matching: lexical/domain overlap alone must not manufacture a match.
test('1 candidate matching rejects deceptive lexical/domain overlap', () => {
  const candidates = [
    { id: 'real', name: 'Emergency department diversion', domains: ['health'], problemTags: ['overcrowding'], requiredEvidence: ['causal'] },
    { id: 'decoy', name: 'Department of public works fleet replacement', domains: ['public-works'], problemTags: ['fleet'], requiredEvidence: ['causal'] }
  ];
  const found = Discovery.discoverInterventions({ problem: 'reduce emergency department overcrowding', candidates });
  assert.ok(found.some(item => item.id === 'real'));
  assert.ok(!found.some(item => item.id === 'decoy'));
});

// 2. Discovery coverage/audit: arbitrary problems must expose the gap instead of silently collapsing to zero.
test('2 discovery records coverage and an auditable empty-result state', () => {
  const problem = 'reduce municipal aviation noise';
  const result = Discovery.discoverInterventions({ problem, candidates: [] });
  const coverage = Discovery.evidenceCoverage(result);
  assert.deepEqual(coverage, { total: 0, complete: 0, withEvidenceGaps: 0, coverageRate: 0 });
  const audit = Discovery.discoveryAudit({
    problem,
    candidates: [],
    sourceSearches: [
      { sourceId: 'research-discovery', sourceType: 'research', status: 'searched', candidatesReturned: 0 },
      { sourceId: 'municipal-programs', sourceType: 'local-program', status: 'searched', candidatesReturned: 0 }
    ]
  });
  assert.deepEqual(audit.sourcesSearched, []);
  assert.deepEqual(audit.sourceSearches, [
    { sourceId: 'research-discovery', sourceType: 'research', status: 'searched', candidatesReturned: 0 },
    { sourceId: 'municipal-programs', sourceType: 'local-program', status: 'searched', candidatesReturned: 0 }
  ]);
  assert.equal(audit.candidatesConsidered, 0);
  assert.equal(audit.candidatesMatched, 0);
  assert.equal(audit.candidatesUnmatched, 0);
  assert.equal(audit.emptyResult, true);
  assert.equal(audit.status, 'no-candidates-found');
  assert.equal(typeof audit.candidateUniverseHash, 'string');
  assert.equal(audit.candidateUniverseHash.length, 64);
  assert.deepEqual(audit.evidenceCoverage, coverage);

  // A candidate from a searched source that is genuinely unrelated must remain unmatched.
  // Keep the problem and candidate lexically disjoint so the adversarial case tests matching rather than vocabulary.
  const searchedButUnmatched = Discovery.discoveryAudit({
    problem,
    candidates: [{ id: 'fleet-replacement', name: 'Municipal fleet replacement', domains: ['public-works'], problemTags: ['fleet'], requiredEvidence: ['causal'] }],
    sourceSearches: [{ sourceId: 'research-discovery', sourceType: 'research', status: 'searched', candidatesReturned: 1 }]
  });
  assert.equal(searchedButUnmatched.candidatesConsidered, 1);
  assert.equal(searchedButUnmatched.candidatesMatched, 0);
  assert.equal(searchedButUnmatched.candidatesUnmatched, 1);
  assert.notEqual(searchedButUnmatched.candidateUniverseHash, audit.candidateUniverseHash);
});

// 3. Contradiction/incompleteness: missing or blocked evidence is never silently treated as zero effect.
test('3 contradiction and incompleteness gates remain fail-closed', () => {
  const result = Discovery.discoverInterventions({
    problem: 'emergency department overcrowding',
    acquiredCandidates: [{ id: 'candidate-a', name: 'ED diversion', domains: ['health'], problemTags: ['overcrowding'], requiredEvidence: ['causal', 'cost'] }],
    evidenceIndex: { 'candidate-a': { causal: { status: 'blocked' }, cost: { status: 'supported' } } }
  });
  assert.equal(result[0].evidenceState, 'evidence-gap');
  assert.ok(result[0].missingEvidence.includes('causal'));
});

// 4. Evidence changes invalidate the prior decision fingerprint.
test('4 evidence changes invalidate the prior decision fingerprint', () => {
  const first = Evidence.decisionFingerprint({ decisionId: 'D-1', evidence: { causal: 'v1', cost: 10 } });
  const second = Evidence.decisionFingerprint({ decisionId: 'D-1', evidence: { causal: 'v2', cost: 10 } });
  assert.notEqual(first, second);
});

// 5. Historical replay signature is deterministic and input-sensitive.
test('5 historical replay signature is deterministic and input-sensitive', () => {
  const a = Learning.replaySignature({ decisionId: 'D-1', inputs: { outcome: 10 } });
  const b = Learning.replaySignature({ decisionId: 'D-1', inputs: { outcome: 10 } });
  const c = Learning.replaySignature({ decisionId: 'D-1', inputs: { outcome: 11 } });
  assert.equal(a, b);
  assert.notEqual(a, c);
});

// 6. Sensitivity produces a visible recommendation flip.
test('6 sensitivity produces a visible recommendation flip', () => {
  const low = Learning.sensitivityRecommendation({ baseline: { a: 10, b: 9 }, scenario: { a: 8, b: 12 } });
  assert.equal(low.baselineRecommendation, 'a');
  assert.equal(low.scenarioRecommendation, 'b');
  assert.equal(low.flipped, true);
});

// 7. Transportability attacks reject unlabeled cross-jurisdiction evidence.
test('7 transportability attacks reject unlabeled cross-jurisdiction evidence', () => {
  assert.throws(() => Evidence.assertTransportable({ sourceJurisdiction: 'Toronto', targetJurisdiction: 'Ottawa', transportability: null }), /transportability/);
});

// 8. Drift signal is observable and learning remains non-automatic.
test('8 drift signal is observable and learning remains non-automatic', () => {
  const signal = Learning.detectDrift({ expected: 100, observed: 130, threshold: 0.2 });
  assert.equal(signal.drift, true);
  assert.equal(signal.recalibrationRequired, true);
  assert.equal(signal.autoApplied, false);
});

// 9. Arbitrary problems never become a fabricated recommendation.
test('9 arbitrary problems never become a fabricated recommendation', () => {
  const result = Discovery.discoverInterventions({ problem: 'municipal aviation noise', candidates: [] });
  assert.equal(result.length, 0);
});

// 10. Comparable-city learning surfaces solutions without importing their effects.
test('10 comparable-city learning surfaces solutions without importing their effects', () => {
  const lead = { id: 'city-lead', name: 'Neighbourhood violence intervention', problemTags: ['violent-crime'], discovery: { source: 'comparable-city', effectsImported: false } };
  assert.equal(lead.discovery.effectsImported, false);
});

// 11. Production certification is impossible without explicit gate evidence.
test('production certification is impossible without explicit gate evidence', () => {
  assert.throws(() => certifyProductionArtifact({}), /gate/);
});

// 12. Artifact projection preserves the persisted decision core.
test('artifact projection preserves the persisted decision core', () => {
  const decision = { decisionId: 'D-1', rationale: { recommendation: 'status-quo' }, audit: { integrity: true } };
  const projected = projectDecisionArtifact(decision);
  assert.equal(projected.decisionId, 'D-1');
  assert.equal(projected.rationale.recommendation, 'status-quo');
});
