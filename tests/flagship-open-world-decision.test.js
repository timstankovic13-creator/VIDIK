'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { executeFullCapacityDecision } = require('../js/decision-discovery-execution');

const PROBLEM = 'How should a municipality allocate $10M of new spending over three years to reduce violent crime?';

const STATUS_QUO = {
  explicit: true,
  id: 'status-quo-violent-crime-flagship',
  description: 'Continue the current municipal service and public-safety allocation pattern with no new discretionary $10M package.',
  value: null,
  unit: null,
  unknownIsNotZero: true
};

test('flagship open-world decision traverses the complete governed decision chain', async () => {
  const run = await executeFullCapacityDecision({
    problem: PROBLEM,
    requiredSourceTypes: ['intervention-library'],
    statusQuo: STATUS_QUO,
    decisionContext: {
      jurisdiction: 'Ottawa, Canada',
      objective: 'reduce violent crime',
      decisionType: 'municipal resource allocation',
      budget: { amount: 10000000, currency: 'CAD', horizonYears: 3 },
      consequential: true,
      validationMode: 'flagship-open-world-decision-v1',
      decisionId: 'flagship-violent-crime'
    },
    discoveryJurisdiction: 'CA'
  });

  // Problem integrity and open-world discovery.
  assert.equal(run.problem, PROBLEM);
  assert.ok(run.runHash);
  assert.ok(run.runHash);
  assert.ok(run.governance.discoveryStrategyHash);
  assert.ok(run.sourceSearches.length > 0);
  assert.ok(run.candidates.length > 0);
  assert.ok(run.governance.candidateUniverseIntelligence);
  assert.ok(run.governance.candidateUniverseIntelligence.discoveryCompleteness !== undefined);

  // The source-driven layer must return actionable interventions, not data artifacts.
  for (const candidate of run.candidates) {
    assert.equal(candidate.discovery?.leadOnly, true);
    assert.equal(candidate.discovery?.effectsImported, false);
    assert.equal(candidate.discovery?.discoveryOnly, true);
    assert.ok(candidate.name);
    assert.doesNotMatch(candidate.name, /^(crime statistics|crime dataset|police annual report|municipal crime dashboard|provider directory)$/i);
  }

  // Evidence is searched per discovered option, but discovery-only evidence cannot
  // silently become verified decision evidence or unlock a recommendation.
  assert.equal(run.evidenceSearches.length, run.candidates.length);
  assert.ok(run.evidenceDiscovery.length > 0);
  assert.equal(run.governance.evidenceDiscoveryOnly, true);
  assert.equal(run.governance.evidenceSearchComplete, true);
  assert.equal(run.governance.recommendationAllowed, false);
  assert.equal(run.decision.recommendation, null);
  assert.equal(run.decision.status, 'recommendation-blocked');

  // Evidence-to-decision bridge exists for every option and exposes the downstream
  // parameter, marginal-effect, uncertainty/VOI, and optimization gates.
  const gates = Object.values(run.governance.evidenceToDecisionGates);
  assert.equal(gates.length, run.candidates.length);
  assert.ok(gates.length > 0);
  for (const gate of gates) {
    assert.ok(gate.gates);
    assert.ok(Object.hasOwn(gate.gates, 'A_evidenceQuality'));
    assert.ok(Object.hasOwn(gate.gates, 'B_candidateParameter'));
    assert.ok(Object.hasOwn(gate.gates, 'C_marginalResourceEffect'));
    assert.ok(Object.hasOwn(gate.gates, 'D_uncertaintyVOIOptimization'));
  }

  // Why/Why-not, transferability, knowledge graph, and external source network
  // must all be present before a decision can be considered complete.
  assert.equal(run.governance.whyNotAvailable, true);
  assert.equal(run.governance.knowledgeGraphPresent, true);
  assert.equal(run.governance.externalSourceNetworkPresent, true);
  assert.ok(run.nextPhase?.whyWhyNot);
  assert.ok(run.nextPhase?.knowledgeGraph);
  assert.ok(run.nextPhase?.sourceNetwork);
  assert.ok(run.intelligence?.governance);
  assert.ok(run.intelligence?.governance?.learning);

  // Status quo remains first-class and the lifecycle records the full chain,
  // including uncertainty/VOI/optimization and outcome-learning stages.
  assert.equal(run.governance.outcomeClosure?.decisionArtifactHash, run.runHash);
  assert.ok(run.governance.reviewPlan);
  assert.ok(run.governance.decisionLifecycle);
  for (const stage of ['discovery','evidenceVerification','universe','learningDiscovery','downstream','whyWhyNot','transferability','audit','outcomeReview','learning']) {
    assert.ok(Object.hasOwn(run.governance.decisionLifecycle, stage), `missing lifecycle stage: ${stage}`);
  }
  assert.equal(run.governance.counterfactualRequired, true);

  // Every discovered option gets an immutable candidate artifact, but none is
  // recommendation-eligible while evidence remains discovery-only.
  const artifacts = Object.values(run.governance.decisionArtifacts);
  assert.equal(artifacts.length, run.candidates.length);
  assert.ok(artifacts.length > 0);
  for (const artifact of artifacts) {
    assert.equal(artifact.validation?.valid, true);
    assert.equal(artifact.recommendationAllowed, false);
  }

  // Query expansion must move beyond the literal problem into public-safety
  // intervention vocabulary rather than depending on a curated candidate list.
  const queryText = [
    ...(run.discoveryQueries || []),
    ...run.sourceSearches.flatMap(s => [s.query || '', ...(s.attempts || []).map(a => a.query || '')])
  ].join(' ');
  assert.match(queryText, /violence|crime|policing|deterrence|intervention|safety/i);

  console.log(JSON.stringify({
    validation: 'flagship-open-world-decision-v1',
    candidates: run.candidates.length,
    evidenceSearches: run.evidenceSearches.length,
    evidenceLeads: run.evidenceDiscovery.reduce((n, item) => n + (item.evidenceLeads?.length || 0), 0),
    recommendationAllowed: run.governance.recommendationAllowed,
    decisionStatus: run.decision.status,
    lifecycleStages: Object.keys(run.governance.decisionLifecycle),
    runHash: run.runHash
  }, null, 2));
});
