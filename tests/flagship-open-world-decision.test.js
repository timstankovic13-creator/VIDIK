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

  assert.equal(run.problem, PROBLEM);
  assert.match(run.runHash, /^[a-f0-9]{64}$/);
  assert.match(run.governance.discoveryStrategyHash, /^[a-f0-9]{64}$/);
  assert.ok(run.sourceSearches.length > 0);
  assert.ok(run.candidates.length > 0);

  const universe = run.governance.candidateUniverseIntelligence;
  assert.ok(universe);
  assert.ok(['universe-found', 'universe-incomplete'].includes(universe.status));
  assert.equal(universe.candidatesConsidered, run.candidates.length);
  assert.ok(universe.uniqueCandidateNames > 0);
  assert.equal(typeof universe.weakUniverse, 'boolean');
  assert.equal(typeof universe.sufficientForRecommendation, 'boolean');
  assert.ok(Array.isArray(universe.missingInterventionFamilies));
  assert.ok(Array.isArray(universe.missingInterventionClasses));

  for (const candidate of run.candidates) {
    assert.equal(candidate.discovery?.effectsImported, false);
    assert.equal(candidate.discovery?.leadOnly, true);
    assert.ok(candidate.name);
    assert.doesNotMatch(candidate.name, /^(crime statistics|crime dataset|police annual report|municipal crime dashboard|provider directory)$/i);
  }

  assert.equal(run.evidenceSearches.length, run.candidates.length);
  assert.ok(run.evidenceDiscovery.length > 0);
  assert.equal(run.governance.evidenceDiscoveryOnly, true);
  assert.equal(run.governance.evidenceSearchComplete, true);
  assert.equal(run.governance.recommendationAllowed, false);
  assert.equal(run.decision.recommendation, null);
  assert.equal(run.decision.status, 'recommendation-blocked');

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

  assert.equal(run.governance.whyNotAvailable, true);
  assert.equal(run.governance.knowledgeGraphPresent, true);
  assert.equal(run.governance.externalSourceNetworkPresent, true);
  assert.ok(run.nextPhase?.whyWhyNot);
  assert.ok(run.nextPhase?.knowledgeGraph);
  assert.ok(run.nextPhase?.sourceNetwork);
  assert.ok(run.intelligence?.governance);
  assert.ok(run.intelligence?.governance?.learning);

  assert.ok(run.governance.outcomeClosure?.baselineHash);
  assert.match(run.governance.outcomeClosure.baselineHash, /^[a-f0-9]{64}$/);
  assert.ok(run.governance.reviewPlan);
  assert.ok(run.governance.decisionLifecycle);
  const lifecycleIds = new Set(run.governance.decisionLifecycle.phases.map(phase => phase.id));
  for (const id of [
    'problem', 'discovery', 'intervention-universe', 'evidence-verification',
    'parameters', 'marginal-resource-effect', 'uncertainty', 'voi',
    'optimization', 'why-why-not', 'transferability', 'decision',
    'override', 'audit', 'outcome-review', 'learning'
  ]) {
    assert.ok(lifecycleIds.has(id), `missing lifecycle phase: ${id}`);
  }
  assert.equal(run.governance.counterfactualRequired, true);

  const artifacts = Object.values(run.governance.decisionArtifacts);
  assert.equal(artifacts.length, run.candidates.length);
  assert.ok(artifacts.length > 0);
  for (const artifact of artifacts) {
    assert.equal(artifact.validation?.valid, true);
    assert.equal(artifact.recommendationAllowed, false);
  }

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
    lifecycleStages: run.governance.decisionLifecycle.phases.map(p => p.id),
    runHash: run.runHash
  }, null, 2));
});
