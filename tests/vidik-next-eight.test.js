'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const Next = require('../js/vidik-next-phase');
const Discovery = require('../js/discovery-transfer-intelligence');
const { SOURCE_REGISTRY } = require('../js/source-registry');

test('1. blind 48-problem benchmark expands strategy without problem-specific intervention hints', () => {
  const cases = Next.buildBlindBenchmark();
  assert.equal(cases.length, 48);
  const hashes = new Set();
  for (const item of cases) {
    const strategy = Discovery.buildSearchStrategy(item.problem, { jurisdiction: 'CA', domains: [item.domain] });
    assert.equal(strategy.requiredSourceTypes.length, 5);
    assert.ok(strategy.queries.length >= 5);
    hashes.add(strategy.strategyHash);
  }
  assert.equal(hashes.size, 48);
});

test('2. external source network is broad, provenance-ready, and jurisdiction-aware', () => {
  const network = Next.buildExternalSourceNetwork('reduce an unseen municipal problem', { jurisdiction: 'CA', comparatorJurisdictions: ['US', 'UK', 'AU'] });
  assert.ok(network.sourceCount >= 8);
  assert.ok(network.jurisdictions.includes('CA'));
  assert.ok(network.jurisdictions.includes('international'));
  assert.ok(network.sourceNetwork.every(source => source.endpoint && source.accessMethod && source.effectsImported === false));
  assert.ok(SOURCE_REGISTRY.some(source => source.domain === 'causal-evidence'));
});

test('3. knowledge graph preserves decision relationships instead of flattening evidence', () => {
  const graph = Next.buildDecisionKnowledgeGraph({
    problem: 'reduce emergency department overcrowding',
    candidates: [{ id: 'community-paramedicine', name: 'Community paramedicine', problemTags: ['ED overcrowding'], mechanism: 'diversion', implementation: 'local paramedic service', resource: 'paramedic hours' }],
    evidenceIndex: { 'community-paramedicine': { causal: { status: 'supported', population: 'frequent ED users', jurisdiction: 'CA' } } },
    statusQuo: { explicit: true }
  });
  assert.ok(graph.nodes.some(node => node.type === 'problem'));
  assert.ok(graph.nodes.some(node => node.type === 'evidence'));
  assert.ok(graph.edges.some(edge => edge.relation === 'problem->intervention'));
  assert.ok(graph.edges.some(edge => edge.relation === 'intervention->evidence'));
  assert.ok(graph.graphHash);
});

test('4. why/why-not exposes winner, alternatives, assumptions, reversal conditions, and information gaps', () => {
  const result = Next.buildWhyWhyNot({
    ranked: [
      { candidateId: 'a', score: 9, evidenceComplete: true, recommendationEligible: true },
      { candidateId: 'b', score: 5, evidenceComplete: true, recommendationEligible: true },
      { candidateId: 'c', score: null, evidenceComplete: false, recommendationEligible: false }
    ],
    evidenceIndex: { c: { causal: { status: 'unknown' } } },
    analysis: { a: { keyAssumption: 'effect persists locally', reversalCondition: 'effect estimate falls below threshold' } },
    statusQuo: { explicit: true }
  });
  assert.equal(result.winner, 'a');
  assert.equal(result.why.keyAssumption, 'effect persists locally');
  assert.ok(result.whyNot.some(item => item.candidateId === 'b' && item.whyNot.includes('lower-supported-value')));
  assert.ok(result.whyNot.some(item => item.candidateId === 'c' && item.whyNot.includes('evidence-incomplete')));
  assert.equal(result.statusQuo.explicit, true);
});

test('5. comparable-city intelligence remains transferability-only', () => {
  const transfer = Discovery.assessTransferability({ context: { problem: 'traffic injuries', population: 'drivers', jurisdiction: 'US', institutionalCapacity: 'high', implementationEnvironment: 'urban', evidenceBase: 'strong' } }, { problem: 'traffic injuries', population: 'drivers', jurisdiction: 'CA', institutionalCapacity: 'high', implementationEnvironment: 'urban', evidenceBase: 'strong' });
  assert.equal(transfer.effectsImported, false);
  assert.equal(transfer.causalEffectTransferred, false);
  assert.equal(transfer.classification, 'requires-local-validation');
});

test('6. adversarial stress suite blocks sensitivity flips, malformed inputs, and effect import', () => {
  const clean = Next.adversarialDecisionStress({ baseline: { winner: 'a' }, scenarios: [{ winner: 'a' }], malformed: {}, transportability: [{ effectsImported: false }] });
  assert.equal(clean.blocked, false);
  const attacked = Next.adversarialDecisionStress({ baseline: { winner: 'a' }, scenarios: [{ winner: 'b' }], malformed: { nonFiniteEstimate: true, negativeVOI: true, missingUncertainty: true }, transportability: [{ causalEffectTransferred: true }] });
  assert.equal(attacked.blocked, true);
  assert.ok(attacked.failures.includes('recommendation-flip') || attacked.recommendationFlips > 0);
  assert.ok(attacked.failures.includes('causal-effect-import'));
});

test('7. outcome learning proposes governed review without rewriting history or mutating parameters', () => {
  const review = Next.outcomeLearningReview([
    { baselineDecisionHash: 'baseline-a', predicted: 10, observed: 13, deviation: 3 },
    { baselineDecisionHash: 'baseline-a', predicted: 10, observed: 9, deviation: -1 }
  ], 'baseline-a');
  assert.equal(review.status, 'governed-review');
  assert.equal(review.baselineHash, 'baseline-a');
  assert.equal(review.historyRewrite, false);
  assert.equal(review.automaticParameterMutation, false);
  assert.equal(review.proposedOnly, true);
});

test('8. unseen-problem end-to-end certification requires complete source coverage and an explicit status quo', () => {
  const sourceResults = Next.SOURCE_TYPES.map(sourceType => ({ sourceType, candidates: [] }));
  const certified = Next.certifyUnseenProblem({
    problem: 'reduce a previously unconfigured municipal burden',
    context: { jurisdiction: 'CA' },
    sourceResults,
    candidates: [],
    evidenceIndex: {},
    ranked: [],
    statusQuo: { explicit: true }
  });
  assert.equal(certified.certified, true);
  assert.equal(certified.gates.discoveryComplete, true);
  assert.equal(certified.gates.graphPresent, true);
  assert.equal(certified.gates.statusQuoExplicit, true);
  const blocked = Next.certifyUnseenProblem({ problem: 'same unseen problem', sourceResults: sourceResults.slice(0, 4), candidates: [], statusQuo: { explicit: false } });
  assert.equal(blocked.certified, false);
});
