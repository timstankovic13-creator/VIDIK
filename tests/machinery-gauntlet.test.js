'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  normalizeCandidate, classifyEvidence, evidenceState, parameterState,
  buildStatusQuo, recommendationGate, sensitivity, estimateVOI, auditHash
} = require('../src/full-scope/decision-engine');
const { normalize, admissible, optimize, sensitivityEnvelope } = require('../src/full-scope/optimizer');
const { runDecisionPipeline, prepareAnalysis, finalizeArtifact } = require('../src/full-scope/orchestrator');
const { createDecisionArtifact, validateDecisionArtifact, detectTamper } = require('../src/full-scope/artifact-engine');
const { comparableCityTransfer, buildTransferSet, outcomeReview, detectDrift, registerFailure } = require('../src/full-scope/learning-engine');
const { discoverInterventions, expandProblemTerms } = require('../src/full-scope/discovery-engine');

const ev = (sourceId, id = sourceId, design = 'quasi-experimental', extra = {}) => ({
  id, sourceId, design, verified: true, ...extra
});
const good = (id = 'a', effect = 10, resource = 100) => ({
  id, name: id, discoveryOnly: false, leadOnly: false, effectsImported: false,
  evidence: [ev(`${id}-s1`), ev(`${id}-s2`)],
  parameter: { effect, resource, effectUnit: 'incidents avoided', resourceUnit: 'dollars', verified: true,
    sourceIds: [`${id}-p1`, `${id}-p2`] },
  parameters: [{ effect, resource, effectUnit: 'incidents avoided', resourceUnit: 'dollars', verified: true,
    sourceIds: [`${id}-p1`, `${id}-p2`] }]
});
const status = { explicit: true, id: 'sq', description: 'Continue current approach' };

function assertBlocked(result, reason) {
  assert.equal(result.allowed, false);
  assert.ok(result.blockedReasons?.includes(reason) || result.reasons?.includes(reason), `${reason} missing`);
}

// ---------- Decision/evidence machinery ----------
test('normalization is deterministic when candidate id is missing', () => {
  const a = normalizeCandidate({ name: 'no id' });
  const b = normalizeCandidate({ name: 'no id' });
  assert.equal(a.id, b.id);
  assert.equal(a.id, 'candidate:no-id');
});

test('evidence requires two independent verified sources, not two records from one source', () => {
  const c = good();
  c.evidence = [ev('same'), ev('same', 'different')];
  assert.equal(evidenceState(c).hasIndependentCausalEvidence, false);
  c.evidence.push(ev('other'));
  assert.equal(evidenceState(c).hasIndependentCausalEvidence, true);
});

test('imported causal effects never count as admissible evidence', () => {
  const c = good();
  c.evidence = [ev('one', '1', 'rct', { importedEffect: true }), ev('two', '2', 'rct', { importedEffect: true })];
  const state = evidenceState(c);
  assert.equal(state.hasIndependentCausalEvidence, false);
  assert.equal(state.importedEffectCount, 2);
});

test('evidence classification is conservative for observational designs', () => {
  const x = classifyEvidence({ id: 'x', sourceId: 's', design: 'cross-sectional descriptive survey', verified: true });
  assert.equal(x.causal, false);
  assert.equal(x.admissible, false);
});

test('parameter source independence is enforced', () => {
  const c = good();
  c.parameters[0].sourceIds = ['only-one'];
  assert.equal(parameterState(c).independentlySourced, false);
  assertBlocked(recommendationGate(c, { problem: 'reduce harm', statusQuo: status }), 'independently-verified-parameter-missing');
});

test('missing problem, status quo, evidence, parameter, and units each block recommendation', () => {
  const c = good();
  assertBlocked(recommendationGate(c, { problem: '', statusQuo: status }), 'problem-not-defined');
  assertBlocked(recommendationGate(c, { problem: 'x', statusQuo: {} }), 'status-quo-missing');
  c.evidence = [];
  assertBlocked(recommendationGate(c, { problem: 'x', statusQuo: status }), 'independent-causal-evidence-missing');
  c.evidence = [ev('1'), ev('2')];
  c.parameters[0].verified = false;
  assertBlocked(recommendationGate(c, { problem: 'x', statusQuo: status }), 'independently-verified-parameter-missing');
  c.parameters[0].verified = true; c.parameters[0].resourceUnit = null;
  assertBlocked(recommendationGate(c, { problem: 'x', statusQuo: status }), 'resource-effect-units-missing');
});

test('discovery and lead flags cannot be omitted into recommendation eligibility', () => {
  const c = good();
  c.discoveryOnly = undefined;
  c.leadOnly = undefined;
  assertBlocked(recommendationGate(c, { problem: 'x', statusQuo: status }), 'discovery-lead-not-recommendation');
});

test('explicit false discovery and lead flags are required before recommendation', () => {
  const c = good();
  const r = recommendationGate(c, { problem: 'x', statusQuo: status });
  assert.equal(r.allowed, true);
});

test('status quo builder preserves zero-valued observations', () => {
  const sq = buildStatusQuo({ effect: 0, resource: 0, effectUnit: 'events', resourceUnit: 'dollars', observed: true });
  assert.equal(sq.effect, 0); assert.equal(sq.resource, 0); assert.equal(sq.observed, true);
});

// ---------- Numeric/adversarial machinery ----------
for (const [label, value] of [['NaN', NaN], ['Infinity', Infinity], ['-Infinity', -Infinity], ['string NaN', 'NaN'], ['empty', '']]) {
  test(`non-finite effect is blocked: ${label}`, () => {
    const c = good('bad'); c.parameter.effect = value; c.parameters[0].effect = value;
    const r = admissible(c);
    assert.equal(r.allowed, false);
    assert.ok(r.reasons.includes('positive-effect-required'));
  });
}

test('zero and negative resources are blocked', () => {
  for (const resource of [0, -1, '0', '-10']) {
    const r = admissible(good('r', 10, resource));
    assert.equal(r.allowed, false);
    assert.ok(r.reasons.includes('positive-resource-required'));
  }
});

test('conflicting raw and parameter values are rejected rather than silently normalized', () => {
  const c = good('conflict'); c.effect = 99; c.resource = 100;
  const r = admissible(c);
  assert.ok(r.reasons.includes('effect-parameter-conflict'));
});

test('conflicting units are rejected', () => {
  const c = good('units'); c.effectUnit = 'lives saved'; c.resourceUnit = 'hours';
  const r = admissible(c);
  assert.ok(r.reasons.includes('effect-unit-parameter-conflict'));
  assert.ok(r.reasons.includes('resource-unit-parameter-conflict'));
});

test('optimizer rejects incomparable effect units', () => {
  const a = good('a'); const b = good('b'); b.parameter.effectUnit = 'hospitalizations avoided';
  const out = optimize('health', [a, b]);
  assert.equal(out.comparable, false);
  assert.equal(out.selected, null);
});

test('optimizer rejects incomparable resource units', () => {
  const a = good('a'); const b = good('b'); b.parameter.resourceUnit = 'staff-hours';
  const out = optimize('health', [a, b]);
  assert.equal(out.comparable, false);
  assert.equal(out.selected, null);
});

test('optimizer blocks malformed candidates without crashing the universe', () => {
  const out = optimize('crime', [null, {}, good('valid')]);
  assert.equal(out.selected.candidateId, 'valid');
});

test('optimizer budget is explicit and infeasibility is closed', () => {
  const out = optimize('x', [good('a', 10, 100), good('b', 8, 80)], { budget: 10 });
  assert.equal(out.selected, null);
  assert.equal(out.reason, undefined);
  assert.equal(out.blocked.length, 0);
});

test('optimizer must not manufacture opportunity cost from a dominated candidate', () => {
  const a = good('a', 10, 100); const b = good('b', 9, 200);
  const out = optimize('x', [a, b]);
  assert.ok(out.opportunityCost);
  assert.notEqual(out.opportunityCost.againstCandidateId, 'b');
});

// ---------- Sensitivity / VOI ----------
test('sensitivity handles unnamed scenarios without temporal-dead-zone failure', () => {
  const out = sensitivity(good('s'), [{ effect: 5, resource: 100, baselineRatio: 0.1, recommendationEligible: true }]);
  assert.equal(out.defined, true);
  assert.equal(out.scenarios[0].id, 'scenario-1');
});

test('sensitivity rejects invalid resource', () => {
  const c = good('s'); c.parameters[0].resource = NaN;
  assert.equal(sensitivity(c, []).defined, false);
});

test('VOI rejects negative/non-finite inputs instead of propagating them', () => {
  const x = estimateVOI({ uncertainty: -5, decisionGap: Infinity, researchCost: -2 });
  assert.ok(Number.isFinite(x.valueOfInformation));
  assert.ok(Number.isFinite(x.netValue));
});

// ---------- Discovery ----------
test('discovery vocabulary expands arbitrary problem domains', () => {
  for (const problem of ['violent crime', 'opioid overdose', 'flood risk', 'housing instability', 'road deaths', 'unemployment', 'school attendance', 'air pollution', 'small business failure']) {
    assert.ok(expandProblemTerms(problem).length >= 1, problem);
  }
});

test('discovery never upgrades a lead into a causal recommendation', () => {
  const out = discoverInterventions('reduce violent crime', [{ id: 'x', name: 'program', sourceId: 's' }]);
  assert.ok(out.every(x => x.leadOnly === true && x.discoveryOnly === true));
});

test('discovery deduplicates equivalent candidate identities', () => {
  const out = discoverInterventions('crime', [
    { id: 'x', name: 'Same Program', sourceId: 'a' },
    { id: 'x', name: 'Same Program', sourceId: 'b' }
  ]);
  assert.equal(new Set(out.map(x => x.id)).size, out.length);
});

// ---------- Comparable-city learning ----------
test('comparable city transfer is evidence context, never local effect import', () => {
  const row = comparableCityTransfer({ cityId: 'toronto', problem: 'crime', interventionId: 'x', evidenceVerified: true, contextComparable: true, effect: 99 });
  assert.equal(row.causalEffectImported, false);
  assert.equal(row.effect, undefined);
});

test('learning rejects transfer without provenance/context', () => {
  const row = comparableCityTransfer({ cityId: 'x', problem: 'p', interventionId: 'i' });
  assert.equal(row.eligible, false);
});

test('learning cannot mutate parameters after outcome review', () => {
  const out = outcomeReview({ expectedEffect: 10, observedEffect: 5, parameter: { effect: 10 } });
  assert.equal(out.parameterMutationAllowed, false);
  assert.equal(out.parameter?.effect, undefined);
});

test('drift requires bounded valid threshold and never mutates parameters', () => {
  const out = detectDrift({ expectedEffect: 10, observedEffect: 1, threshold: 0.2 });
  assert.equal(out.drift, true);
  assert.equal(out.parameterMutationAllowed, false);
});

test('critical failures suppress recommendation', () => {
  const out = registerFailure({ severity: 'critical', component: 'evidence' });
  assert.equal(out.recommendationSuppressed, true);
});

test('transfer set cannot turn comparable-city effects into local causal evidence', () => {
  const out = buildTransferSet('crime', [{ cityId: 'x', problem: 'crime', interventionId: 'i', evidenceVerified: true, contextComparable: true, causalEffectImported: true }]);
  assert.ok(out.eligible.every(x => x.causalEffectImported === false));
});

// ---------- Orchestration ----------
test('orchestrator preserves status quo and blocks lead candidates', () => {
  const lead = { ...good('lead'), discoveryOnly: true, leadOnly: true };
  const out = runDecisionPipeline('crime', [lead], { statusQuo: status });
  assert.equal(out.statusQuo.explicit, true);
  assert.equal(out.recommendation.allowed, false);
});

test('orchestrator cannot let optimizer select a candidate rejected by gates', () => {
  const c = good('x'); c.effectsImported = true;
  const out = runDecisionPipeline('crime', [c], { statusQuo: status });
  assert.equal(out.recommendation.allowed, false);
  assert.deepEqual(out.blockedByIntegration, ['x']);
});

test('orchestrator comparable-city effects never reach artifact governance as imported', async () => {
  const c = good('x');
  const pipeline = runDecisionPipeline('crime', [c], {
    statusQuo: status,
    comparableCities: [{ cityId: 'x', problem: 'crime', interventionId: 'x', evidenceVerified: true, contextComparable: true, causalEffectImported: true }]
  });
  assert.equal(pipeline.recommendation.allowed, true);
  const artifact = await finalizeArtifact(pipeline, {
    counterfactual: { statusQuoExplicit: true, recommendationEligible: true, effect: 10, resource: 100, effectUnit: 'incidents avoided', resourceUnit: 'dollars' },
    reviewSchedule: [{ at: '6m', purpose: 'outcome review' }]
  });
  assert.equal(artifact.governance.comparableCityEffectsImported, false);
});

test('prepareAnalysis keeps parameter mutation disabled', () => {
  assert.equal(prepareAnalysis(good('x')).parameterMutationAllowed, false);
});

// ---------- Artifact integrity ----------
test('artifact rejects missing governance-independent decision prerequisites', async () => {
  await assert.rejects(() => createDecisionArtifact({ problem: 'x', statusQuo: status, recommendation: { allowed: true }, reviewSchedule: [] }), /artifact-counterfactual-invalid/);
});

test('artifact is valid and tamper-evident', async () => {
  const a = await createDecisionArtifact({
    problem: 'x', statusQuo: status, recommendation: { allowed: true, candidateId: 'x' },
    counterfactual: { statusQuoExplicit: true, recommendationEligible: true, effect: 10, resource: 100, effectUnit: 'events', resourceUnit: 'dollars' },
    reviewSchedule: [{ at: '6m', purpose: 'review' }]
  });
  assert.equal(validateDecisionArtifact(a).valid, true);
  assert.equal(await detectTamper(a, a.baselineHash), false);
  const copy = JSON.parse(JSON.stringify(a)); copy.problem = 'tampered';
  assert.equal(await detectTamper(copy, a.baselineHash), true);
});

test('artifact blocks imported effects and malformed review schedules', async () => {
  await assert.rejects(() => createDecisionArtifact({ problem: 'x', statusQuo: status, recommendation: { allowed: true }, governance: { effectsImported: true }, counterfactual: { statusQuoExplicit: true, recommendationEligible: true, effect: 1, resource: 1, effectUnit: 'x', resourceUnit: 'y' }, reviewSchedule: [{ at: '6m', purpose: 'x' }] }), /artifact-imported-effect-forbidden/);
  await assert.rejects(() => createDecisionArtifact({ problem: 'x', statusQuo: status, recommendation: { allowed: true }, counterfactual: { statusQuoExplicit: true, recommendationEligible: true, effect: 1, resource: 1, effectUnit: 'x', resourceUnit: 'y' }, reviewSchedule: [{ at: '6m', purpose: 'x' }, { at: '6m', purpose: 'duplicate' }] }), /artifact-review-schedule-invalid/);
});

// ---------- Cross-layer invariants ----------
test('full machinery does not recommend an option that only has discovery evidence', () => {
  const c = good('x'); c.evidence = [ev('one')];
  const pipeline = runDecisionPipeline('reduce crime', [c], { statusQuo: status });
  assert.equal(pipeline.recommendation.allowed, false);
});

test('full machinery does not recommend with an unverified parameter even when evidence is perfect', () => {
  const c = good('x'); c.parameters[0].verified = false; c.parameter.verified = false;
  const pipeline = runDecisionPipeline('reduce crime', [c], { statusQuo: status });
  assert.equal(pipeline.recommendation.allowed, false);
});

test('full machinery blocks imported learning even with otherwise perfect local evidence', () => {
  const c = good('x'); c.effectsImported = true;
  const pipeline = runDecisionPipeline('reduce crime', [c], { statusQuo: status });
  assert.equal(pipeline.recommendation.allowed, false);
});

test('audit hash is deterministic for equivalent objects', async () => {
  const a = await auditHash({ b: 2, a: 1 });
  const b = await auditHash({ b: 2, a: 1 });
  assert.equal(a, b);
});

test('optimizer sensitivity envelope never emits NaN', () => {
  const out = sensitivityEnvelope(good('x'));
  assert.ok(!Number.isNaN(out.lowEfficiency));
  assert.ok(!Number.isNaN(out.highEfficiency));
});
