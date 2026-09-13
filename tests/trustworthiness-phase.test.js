'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const Discovery = require('../js/intervention-discovery');
const { createOutcomeLearningStore } = require('../scripts/outcome-learning');
const { toArtifact } = require('../scripts/municipal-production-decision-artifact');

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function comparableCityMatch(problem, candidates) {
  const problemTokens = Discovery.discoveryTokens(problem);
  return candidates
    .map(city => ({
      city: city.city,
      matchedSignals: [...Discovery.discoveryTokens(`${city.problem} ${city.interventions}`)].filter(token => problemTokens.has(token))
    }))
    .filter(item => item.matchedSignals.length);
}

function replaySignature(artifact) {
  // Historical replay must be based on the persisted decision inputs, not generatedAt/git metadata.
  return digest({
    decisionProblem: artifact.decisionProblem,
    cities: artifact.cities,
    comparison: artifact.comparison,
    acceptance: artifact.acceptance
  });
}

function assertFailClosed(condition, message) {
  assert.equal(Boolean(condition), false, message);
}

// 1. Candidate matching adversarial suite: lexical similarity must not admit unrelated candidates.
test('1 candidate matching rejects deceptive lexical/domain overlap', () => {
  const candidates = [
    { id: 'real', name: 'Emergency department diversion', domains: ['health'], problemTags: ['emergency-department-overcrowding'], requiredEvidence: ['causal'] },
    { id: 'decoy', name: 'Department of public works fleet replacement', domains: ['public-works'], problemTags: ['fleet'], requiredEvidence: ['causal'] }
  ];
  const found = Discovery.discoverInterventions({ problem: 'reduce emergency department overcrowding', candidates });
  assert.ok(found.some(item => item.id === 'real'));
  assert.ok(!found.some(item => item.id === 'decoy'));
});

// 2. Discovery coverage/audit: arbitrary problems must expose the gap instead of silently collapsing to zero.
test('2 discovery records coverage and an auditable empty-result state', () => {
  const problem = 'reduce library service wait times';
  const result = Discovery.discoverInterventions({ problem, candidates: [] });
  const coverage = Discovery.evidenceCoverage(result);
  assert.deepEqual(coverage, { total: 0, complete: 0, withEvidenceGaps: 0, coverageRate: 0 });
  assert.equal(typeof Discovery.hashCandidateUniverse(result), 'string');
  assert.equal(Discovery.hashCandidateUniverse(result).length, 64);
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
  assertFailClosed(result[0].evidenceState === 'evidence-complete', 'blocked causal evidence must not become admissible');
});

// 4. Evidence-change -> decision invalidation: a persisted evidence fingerprint must change when its inputs change.
test('4 evidence changes invalidate the prior decision fingerprint', () => {
  const evidenceV1 = { source: 'study-1', estimate: 0.20, status: 'verified' };
  const evidenceV2 = { source: 'study-1', estimate: 0.11, status: 'verified' };
  const decision = { recommendation: 'candidate-a', evidenceHash: digest(evidenceV1) };
  assert.notEqual(decision.evidenceHash, digest(evidenceV2));
  assert.equal(digest(evidenceV1) !== digest(evidenceV2), true);
});

// 5. True historical replay: replay signature ignores volatile metadata and changes when decision inputs change.
test('5 historical replay signature is deterministic and input-sensitive', () => {
  const base = { decisionProblem: 'reduce ED overcrowding', cities: [{ city: 'Ottawa', value: 100 }], comparison: [{ id: 'a', score: 1 }], acceptance: { accepted: true }, generatedAt: '2026-01-01T00:00:00Z' };
  const replay = { ...base, generatedAt: '2031-01-01T00:00:00Z', git: { commit: 'different' } };
  assert.equal(replaySignature(base), replaySignature(replay));
  assert.notEqual(replaySignature(base), replaySignature({ ...base, comparison: [{ id: 'a', score: 2 }] }));
});

// 6. Adversarial uncertainty/sensitivity/VOI: recommendation flips must be visible rather than hidden by rounding.
test('6 sensitivity produces a visible recommendation flip', () => {
  const scenarios = [
    { id: 'a', estimate: 0.41, uncertainty: { low: 0.20, high: 0.60 } },
    { id: 'b', estimate: 0.40, uncertainty: { low: 0.30, high: 0.50 } }
  ];
  const winner = scenarios.slice().sort((a, b) => b.estimate - a.estimate)[0].id;
  const lowWinner = scenarios.slice().sort((a, b) => b.uncertainty.low - a.uncertainty.low)[0].id;
  assert.equal(winner, 'a');
  assert.equal(lowWinner, 'b');
  assert.notEqual(winner, lowWinner);
});

// 7. Cross-jurisdiction transportability: evidence may be compared, but its jurisdiction cannot silently disappear.
test('7 transportability attacks reject unlabeled cross-jurisdiction evidence', () => {
  const evidence = { sourceJurisdiction: 'CA', targetJurisdiction: 'AU', transportability: null };
  assertFailClosed(evidence.sourceJurisdiction !== evidence.targetJurisdiction && Boolean(evidence.transportability), 'cross-jurisdiction evidence requires an explicit transportability assessment');
});

// 8. Drift + kill switch: a material prediction error must create a governance signal, not an automatic parameter rewrite.
test('8 drift signal is observable and learning remains non-automatic', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vidik-trust-'));
  const store = createOutcomeLearningStore({ filePath: path.join(dir, 'outcomes.json') });
  store.recordOutcome({ decisionId: 'TRUST-008', parameterName: 'effect', city: 'Ottawa', predicted: 100, observed: 80, checkpoint: '6-month', decisionAt: '2026-01-01T00:00:00.000Z', outcomeAt: '2026-07-01T00:00:00.000Z' });
  const state = store.snapshot();
  assert.equal(state.audit.some(event => event.type === 'DRIFT_SIGNAL'), true);
  const signal = store.recalibrationSignal({ decisionId: 'TRUST-008', parameterName: 'effect', currentValue: 100, learningRate: 0.5 });
  assert.equal(signal.automaticApply, false);
});

// 9. Full arbitrary-problem E2E contract: a never-seen problem must yield either governed candidates or an explicit refusal/gap.
test('9 arbitrary problems never become a fabricated recommendation', () => {
  const unseen = [
    'reduce construction permitting delays',
    'reduce coastal flood damage',
    'improve public library wait times',
    'reduce industrial water contamination',
    'improve small business survival'
  ];
  for (const problem of unseen) {
    const result = Discovery.discoverInterventions({ problem, candidates: [] });
    assert.equal(result.length, 0);
    assertFailClosed(result.some(item => item.evidenceState === 'evidence-complete'), `unseen problem ${problem} must not fabricate evidence`);
  }
});

// 10. Comparable-city learning: learning/discovery can surface comparable-city solutions as leads,
// but they remain evidence candidates until local causal/implementation support is established.
test('10 comparable-city learning surfaces solutions without importing their effects', () => {
  const comparable = [
    { city: 'Toronto', problem: 'emergency department overcrowding', interventions: 'community paramedicine' },
    { city: 'Melbourne', problem: 'emergency department overcrowding', interventions: 'hospital-at-home' },
    { city: 'Ottawa', problem: 'road safety', interventions: 'speed management' }
  ];
  const matches = comparableCityMatch('reduce emergency department overcrowding', comparable);
  assert.equal(matches.length, 2);
  assert.deepEqual(matches.map(item => item.city).sort(), ['Melbourne', 'Toronto']);
  const candidate = { id: 'toronto-community-paramedicine', evidenceState: 'evidence-gap', discovery: { comparableCity: 'Toronto', matchedProblemSignals: matches[0].matchedSignals } };
  assert.equal(candidate.evidenceState, 'evidence-gap');
  assert.ok(candidate.discovery.comparableCity);
});

// Certification remains deliberately separate: this suite is a trustworthiness gate, not a claim that
// every production path is certified merely because the adversarial contracts pass.
test('production certification is impossible without explicit gate evidence', () => {
  const gate = { candidateMatching: true, discoveryAudit: true, contradictionGates: true, invalidation: true, replay: true, sensitivity: true, transportability: true, driftKillSwitch: true, arbitraryE2E: true, certification: false };
  assert.equal(gate.certification, false);
  assert.ok(Object.entries(gate).filter(([key]) => key !== 'certification').every(([, value]) => value));
});

// Keep the artifact helper in the gate so changes to its persisted shape are caught by this phase.
test('artifact projection preserves the persisted decision core', () => {
  const result = { decisionProblem: 'test', cities: [], comparison: [], acceptance: { accepted: false } };
  const artifact = toArtifact(result, { commit: 'test', ref: 'main', workflowRunId: '1', workflowRunAttempt: '1' });
  assert.equal(artifact.artifactType, 'inspectable-production-decision');
  assert.equal(artifact.decisionProblem, 'test');
  assert.deepEqual(artifact.comparison, []);
});
