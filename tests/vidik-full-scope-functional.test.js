'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Closure = require('../js/vidik-decision-artifact-closure');

test('full-scope closure creates a quantified counterfactual only when governed inputs are admissible', () => {
  const gate = { recommendationEligible: true, gates: { E_decisionReadiness: true } };
  const cf = Closure.buildCounterfactual({ statusQuo: { explicit: true, value: 100, unit: 'incidents' }, candidate: { id: 'x', name: 'Intervention X' }, analysis: { estimate: -12, effectUnit: 'incidents', resource: 50000, resourceUnit: 'CAD' }, gate });
  assert.equal(cf.status, 'quantified');
  assert.equal(cf.estimatedIncrementalEffect, -12);
  assert.equal(cf.unknownIsNotZero, false);
});

test('missing causal/resource quantification remains explicitly unknown', () => {
  const cf = Closure.buildCounterfactual({ statusQuo: { explicit: true }, candidate: { id: 'x' }, analysis: {}, gate: { recommendationEligible: false } });
  assert.equal(cf.status, 'unquantified');
  assert.equal(cf.estimatedIncrementalEffect, null);
  assert.equal(cf.unknownIsNotZero, true);
  assert.equal(cf.recommendationEligible, false);
});

test('decision artifact is tamper-evident and enforces readiness consistency', () => {
  const run = { runHash: 'execution-1', decision: { recommendation: 'x', recommendationAllowed: true }, governance: { candidateUniverseIntelligence: { candidatesConsidered: 2 } }, learningDiscovery: { learningHash: 'learn-1' } };
  const gate = { recommendationEligible: true, gates: { E_decisionReadiness: true } };
  const cf = Closure.buildCounterfactual({ statusQuo: { explicit: true }, candidate: { id: 'x', name: 'X' }, analysis: { estimate: 1, effectUnit: 'outcomes', resource: 10, resourceUnit: 'CAD' }, gate });
  const artifact = Closure.buildDecisionArtifact({ problem: 'reduce harm', run, candidate: { id: 'x', name: 'X', discovery: { leadOnly: false } }, gate, analysis: { estimate: 1 }, statusQuo: { explicit: true }, counterfactual: cf, evidence: { causal: { sourceId: 'independent-1' } } });
  assert.equal(Closure.validateDecisionArtifact(artifact).valid, true);
  const tampered = { ...artifact, recommendation: 'different' };
  assert.equal(Closure.validateDecisionArtifact(tampered).valid, false);
  assert.ok(Closure.validateDecisionArtifact(tampered).reasons.includes('artifact-hash-mismatch'));
});

test('review plan preserves immutable baseline and forbids automatic parameter mutation', () => {
  const plan = Closure.buildReviewPlan({ artifactHash: 'abc' });
  assert.deepEqual(plan.checkpoints.map(x => x.months), [6, 12, 24, 60]);
  assert.equal(plan.immutableBaseline, true);
  assert.equal(plan.automaticParameterMutation, false);
});
