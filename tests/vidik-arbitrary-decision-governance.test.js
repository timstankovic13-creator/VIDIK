'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const G = require('../js/vidik-arbitrary-decision-governance');

test('evidence gateway blocks missing, stale, conflicting and unverified evidence', () => {
  const candidate = { id: 'c1', requiredEvidence: ['causal', 'implementation', 'cost', 'equity'] };
  const result = G.verifyEvidenceBundle({ candidate, evidence: {
    causal: { status: 'verified', causal: true, independentSource: true, sourceId: 'study-a' },
    implementation: { status: 'verified', independentSource: true, sourceId: 'impl-a' },
    cost: { status: 'stale', independentSource: true, sourceId: 'cost-a' },
    equity: { status: 'verified', independentSource: false, sourceId: 'equity-a' }
  } });
  assert.equal(result.status, 'blocked');
  assert.ok(result.blocked.includes('cost'));
  assert.ok(result.independentMissing.includes('equity'));
});

test('evidence gateway requires independent verification for every required evidence class', () => {
  const candidate = { id: 'c2', requiredEvidence: ['causal', 'implementation'] };
  const result = G.verifyEvidenceBundle({ candidate, evidence: {
    causal: { status: 'verified', causal: true, independentSource: true },
    implementation: { status: 'verified', independentSource: true }
  } });
  assert.equal(result.status, 'verified');
});

test('candidate universe intelligence exposes weak and failed-source universes instead of treating them as zero', () => {
  const result = G.buildCandidateUniverseIntelligence({
    candidates: [{ id: 'x', name: 'Intervention X', discovery: { provenance: [{ sourceId: 's1' }] } }],
    sourceSearches: [{ sourceId: 's1', status: 'candidates-found' }, { sourceId: 's2', status: 'search-failed', failureReason: 'timeout' }],
    statusQuo: { explicit: true }
  });
  assert.equal(result.status, 'universe-incomplete');
  assert.equal(result.sufficientForRecommendation, false);
  assert.equal(result.sourceFailures[0].sourceId, 's2');
});

test('learning produces comparable-city lead-only candidates without importing effects', () => {
  const result = G.buildLearningDiscoveryLeads({ problem: 'reduce violent crime', comparableCities: [{ city: 'Example City', jurisdiction: 'CA', interventions: ['community violence interruption'] }] });
  assert.equal(result.status, 'learning-leads-found');
  assert.equal(result.effectsImported, false);
  assert.equal(result.recommendationEligible, false);
  assert.equal(result.leads[0].discovery.leadOnly, true);
  assert.equal(result.leads[0].transferability.effectsImported, false);
});

test('lifecycle reports missing downstream production phases explicitly', () => {
  const result = G.buildDecisionLifecycle({ problem: 'reduce violent crime', discovery: true, universe: { candidatesConsidered: 3 }, evidenceVerification: {}, learningDiscovery: {} });
  assert.equal(result.complete, false);
  assert.equal(result.nextRequiredPhase, 'parameters');
  assert.ok(result.phases.some(phase => phase.id === 'optimization' && phase.status === 'not-yet-present'));
});

test('Monster governance passes only when evidence, provenance, status quo and quantitative inputs are admissible', () => {
  const candidate = { id: 'c3', name: 'Verified intervention', requiredEvidence: ['causal', 'implementation'], discovery: { provenance: [{ sourceId: 's1' }] } };
  const pass = G.monsterCase({ problem: 'reduce harm', candidate, statusQuo: { explicit: true }, analysisInputs: { estimate: 4 }, evidence: {
    causal: { status: 'verified', causal: true, independentSource: true }, implementation: { status: 'verified', independentSource: true }
  } });
  assert.equal(pass.status, 'PASS');

  const blocked = G.monsterCase({ problem: 'reduce harm', candidate, statusQuo: { explicit: true }, analysisInputs: { estimate: 4 }, evidence: {
    causal: { status: 'verified', causal: true, independentSource: false }, implementation: { status: 'verified', independentSource: true }
  } });
  assert.equal(blocked.status, 'BLOCKED');
});
