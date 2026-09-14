'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const G = require('../js/vidik-arbitrary-decision-governance');
const C = require('../js/vidik-decision-artifact-closure');

test('hostile: non-finite effects and resources can never quantify a counterfactual', () => {
  for (const analysis of [
    { estimate: NaN, resource: 100, effectUnit: 'cases', resourceUnit: 'CAD' },
    { estimate: Infinity, resource: 100, effectUnit: 'cases', resourceUnit: 'CAD' },
    { estimate: 2, resource: NaN, effectUnit: 'cases', resourceUnit: 'CAD' },
    { estimate: 2, resource: 0, effectUnit: 'cases', resourceUnit: 'CAD' },
    { estimate: 2, resource: -1, effectUnit: 'cases', resourceUnit: 'CAD' },
    { estimate: 2, resource: 100, effectUnit: '', resourceUnit: 'CAD' },
    { estimate: 2, resource: 100, effectUnit: 'cases', resourceUnit: '' }
  ]) {
    const r = C.buildCounterfactual({ statusQuo: { explicit: true }, candidate: { id: 'x' }, analysis, gate: { recommendationEligible: true } });
    assert.equal(r.status, 'unquantified');
    assert.equal(r.estimatedIncrementalEffect, null);
    assert.equal(r.unknownIsNotZero, true);
  }
});

test('hostile: missing, stale, conflicting, and unverified evidence all block', () => {
  for (const status of ['missing', 'stale', 'conflicting', 'unverified', 'blocked']) {
    const r = G.verifyEvidenceBundle({ candidate: { requiredEvidence: ['causal'] }, evidence: { causal: { status, independentSource: true, causal: true } } });
    assert.equal(r.status, 'blocked', status);
  }
});

test('hostile: every required evidence type needs independent verification', () => {
  const evidence = Object.fromEntries(G.REQUIRED_EVIDENCE.map(type => [type, { status: 'verified', independentSource: true, causal: type === 'causal' }]));
  for (const type of G.REQUIRED_EVIDENCE) {
    const tampered = { ...evidence, [type]: { ...evidence[type], independentSource: false } };
    const r = G.verifyEvidenceBundle({ candidate: { requiredEvidence: G.REQUIRED_EVIDENCE }, evidence: tampered });
    assert.equal(r.status, 'blocked', type);
    assert.ok(r.independentMissing.includes(type));
  }
});

test('hostile: A-E gate rejects NaN, Infinity, zero and negative resources', () => {
  const candidate = { id: 'x', requiredEvidence: ['causal'] };
  const base = { candidate, evidence: { causal: { status: 'verified', causal: true, independentSource: true } }, parameter: { value: 1, unit: 'cases' }, uncertainty: { stable: true }, voi: { value: 1 }, optimization: { validated: true }, statusQuo: { explicit: true } };
  for (const resource of [NaN, Infinity, 0, -100, 'not-a-number']) {
    const r = G.buildEvidenceToDecisionGate({ ...base, marginal: { resource, effect: 1 } });
    assert.equal(r.recommendationEligible, false, String(resource));
  }
});

test('hostile: lead-only candidates cannot become recommendations', () => {
  const candidate = { id: 'lead', name: 'Learned idea', discovery: { leadOnly: true }, requiredEvidence: ['causal'] };
  const p = G.monsterCase({ problem: 'reduce harm', candidate, statusQuo: { explicit: true }, analysisInputs: { estimate: 1 }, evidence: { causal: { status: 'verified', causal: true, independentSource: true } } });
  assert.equal(p.status, 'BLOCKED');
  assert.equal(p.recommendationAllowed, false);
});

test('hostile: artifact tampering and gate downgrades are rejected', () => {
  const run = { runHash: 'run-1', decision: { recommendation: 'x', recommendationAllowed: true }, governance: { candidateUniverseIntelligence: { candidatesConsidered: 2 } }, learningDiscovery: { learningHash: 'learn-1' } };
  const gate = { recommendationEligible: true, gates: { A_evidenceQuality: true, B_candidateParameter: true, C_marginalResourceEffect: true, D_uncertaintyVOIOptimization: true, E_decisionReadiness: true } };
  const cf = C.buildCounterfactual({ statusQuo: { explicit: true }, candidate: { id: 'x' }, analysis: { estimate: 1, effectUnit: 'cases', resource: 100, resourceUnit: 'CAD' }, gate });
  const artifact = C.buildDecisionArtifact({ problem: 'reduce harm', run, candidate: { id: 'x', discovery: { leadOnly: false } }, gate, statusQuo: { explicit: true }, counterfactual: cf });
  assert.equal(C.validateDecisionArtifact(artifact).valid, true);
  for (const mutation of [
    a => ({ ...a, recommendation: 'forged' }),
    a => ({ ...a, gates: { ...a.gates, A_evidenceQuality: false } }),
    a => ({ ...a, statusQuo: { explicit: false } }),
    a => ({ ...a, counterfactual: { ...a.counterfactual, status: 'unquantified' } })
  ]) {
    const r = C.validateDecisionArtifact(mutation(artifact));
    assert.equal(r.valid, false);
    assert.ok(r.reasons.includes('artifact-hash-mismatch'));
  }
});

test('hostile: blocked artifacts cannot carry a recommendation', () => {
  const artifact = C.buildDecisionArtifact({ problem: 'x', run: { decision: { recommendation: 'bad', recommendationAllowed: false } }, candidate: { id: 'x' }, gate: { recommendationEligible: false } });
  assert.equal(artifact.recommendationAllowed, false);
  assert.equal(C.validateDecisionArtifact(artifact).valid, false);
  assert.ok(C.validateDecisionArtifact(artifact).reasons.includes('blocked-artifact-has-recommendation'));
});

test('hostile: malformed review schedules fail closed', () => {
  for (const checkpoints of [[], [0], [-1], [NaN], [Infinity], [6, 6], ['bad'], null]) {
    assert.throws(() => C.buildReviewPlan({ artifactHash: 'a', checkpoints }), /review-checkpoints-invalid/);
  }
});

test('hostile: semantic expansion stays bounded even with adversarial synonym input', () => {
  const many = Array.from({ length: 200 }, (_, i) => `variant-${i}`);
  const r = G.buildSemanticExpansion({ problem: 'reduce harm', synonyms: { 'reduce harm': many, reduce: many, harm: many } });
  assert.ok(r.queries.length <= 20);
});

test('hostile: arbitrary comparable-city structures never import effects', () => {
  const shapes = [
    { city: 'A', interventions: { 'program': { effect: 999, outcomeStatus: 'successful' } } },
    { city: 'B', interventions: ['program'] },
    { city: 'C', interventions: { program: 'successful' } },
    { city: 'D', interventions: null },
    { city: 'E' }
  ];
  const r = G.buildLearningDiscoveryLeads({ problem: 'x', comparableCities: shapes });
  assert.equal(r.effectsImported, false);
  assert.equal(r.recommendationEligible, false);
  assert.ok(r.leads.every(lead => lead.discovery.effectsImported === false && lead.discovery.leadOnly === true));
});

test('hostile: empty and malformed candidate universes remain non-recommendable', () => {
  for (const candidates of [[], [null], [{ id: 'x' }], [{ id: 'x', name: 'x', discovery: {} }]]) {
    const r = G.buildCandidateUniverseIntelligence({ candidates, sourceSearches: [], statusQuo: { explicit: true } });
    assert.equal(r.sufficientForRecommendation, false);
  }
});
