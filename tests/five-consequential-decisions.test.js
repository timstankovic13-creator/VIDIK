'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { executeFullCapacityDecision } = require('../js/decision-discovery-execution');

const CASES = Object.freeze([
  {
    id: 'violent-crime',
    problem: 'How should a municipality allocate $10M of new spending over three years to reduce violent crime?',
    objective: 'reduce violent crime',
    vocabulary: /violent|crime|violence|policing|deterrence/i
  },
  {
    id: 'chronic-homelessness',
    problem: 'How should a municipality allocate $10M of new spending over three years to reduce chronic homelessness?',
    objective: 'reduce chronic homelessness',
    vocabulary: /homeless|housing|shelter|rehousing|supportive/i
  },
  {
    id: 'emergency-department-congestion',
    problem: 'How should a municipality and its health-system partners use $10M over three years to reduce emergency-department overcrowding and patient-flow delays?',
    objective: 'reduce emergency department overcrowding',
    vocabulary: /emergency|department|overcrowd|patient|flow|triage|hospital/i
  },
  {
    id: 'extreme-heat',
    problem: 'How should a municipality allocate $10M over three years to reduce heat-related illness during extreme heat events?',
    objective: 'reduce extreme heat illness',
    vocabulary: /heat|cooling|shade|thermal|temperature|heatwave|weather/i
  },
  {
    id: 'infrastructure-backlog',
    problem: 'How should a municipality allocate $10M of new spending over three years to reduce its critical infrastructure maintenance backlog while protecting essential service levels?',
    objective: 'reduce critical infrastructure maintenance backlog',
    vocabulary: /infrastructure|maintenance|asset|backlog|renewal|repair|capital|service level/i
  }
]);

const DECISION_CONTEXT = Object.freeze({
  jurisdiction: 'Ottawa, Canada',
  decisionType: 'municipal resource allocation',
  budget: { amount: 10000000, currency: 'CAD', horizonYears: 3 },
  consequential: true,
  validationMode: 'five-consequential-decisions-v1'
});

function statusQuo(id) {
  return {
    explicit: true,
    id: `status-quo-${id}`,
    description: 'Continue the current municipal service, operating, and capital allocation pattern with no new discretionary $10M package.',
    value: null,
    unit: null,
    unknownIsNotZero: true
  };
}

function normalizedQueryText(run) {
  return (run.discoveryQueries || [])
    .concat((run.sourceSearches || []).flatMap(search => [search.query || '', ...(search.attempts || []).map(attempt => attempt.query || '')]))
    .join(' ');
}

function assertArchitecture(caseDef, run) {
  assert.equal(run.problem, caseDef.problem, `${caseDef.id}: problem was altered`);
  assert.ok(run.governance.discoveryStrategyHash, `${caseDef.id}: missing discovery strategy hash`);
  assert.ok(run.sourceSearches.length > 0, `${caseDef.id}: no intervention source searches`);
  assert.ok(run.candidates.length > 0, `${caseDef.id}: no intervention universe discovered`);
  assert.ok(run.evidenceSearches.length === run.candidates.length, `${caseDef.id}: evidence search count does not cover candidates`);
  assert.ok(run.evidenceDiscovery.length > 0, `${caseDef.id}: no evidence discovery`);
  assert.equal(run.governance.recommendationAllowed, false, `${caseDef.id}: auto-discovered evidence crossed recommendation gate`);
  assert.equal(run.decision.recommendation, null, `${caseDef.id}: recommendation escaped without governed verification`);
  assert.equal(run.decision.status, 'recommendation-blocked', `${caseDef.id}: decision did not fail closed`);

  assert.ok(run.governance.candidateUniverseIntelligence, `${caseDef.id}: missing candidate-universe intelligence`);
  assert.ok(run.governance.whyNotAvailable, `${caseDef.id}: missing why-not layer`);
  assert.ok(run.governance.knowledgeGraphPresent, `${caseDef.id}: missing knowledge graph`);
  assert.ok(run.governance.externalSourceNetworkPresent, `${caseDef.id}: missing external source network`);
  assert.ok(run.governance.decisionArtifacts, `${caseDef.id}: missing decision artifacts`);
  assert.equal(Object.keys(run.governance.decisionArtifacts).length, run.candidates.length, `${caseDef.id}: artifact coverage mismatch`);
  assert.ok(run.governance.outcomeClosure, `${caseDef.id}: missing outcome closure`);
  assert.ok(run.governance.reviewPlan, `${caseDef.id}: missing review plan`);
  assert.ok(run.governance.decisionLifecycle, `${caseDef.id}: missing decision lifecycle`);

  for (const candidate of run.candidates) {
    assert.equal(candidate.discovery?.leadOnly, true, `${caseDef.id}: candidate escaped lead-only boundary: ${candidate.name}`);
    assert.equal(candidate.discovery?.effectsImported, false, `${caseDef.id}: candidate imported effects: ${candidate.name}`);
    const artifact = run.governance.decisionArtifacts[candidate.id];
    assert.ok(artifact, `${caseDef.id}: missing artifact for ${candidate.id}`);
    assert.equal(artifact.validation?.valid, true, `${caseDef.id}: invalid decision artifact for ${candidate.name}`);
    assert.equal(artifact.recommendationAllowed, false, `${caseDef.id}: candidate artifact became recommendation-eligible`);
  }

  const queryText = normalizedQueryText(run);
  assert.match(queryText, caseDef.vocabulary, `${caseDef.id}: discovery never expanded into the problem's domain vocabulary`);
}

test('five consequential decisions run through the same production architecture without shared-vocabulary seeding', async () => {
  const summaries = [];

  for (const caseDef of CASES) {
    const run = await executeFullCapacityDecision({
      problem: caseDef.problem,
      requiredSourceTypes: ['intervention-library'],
      statusQuo: statusQuo(caseDef.id),
      decisionContext: {
        ...DECISION_CONTEXT,
        objective: caseDef.objective,
        decisionId: caseDef.id
      },
      discoveryJurisdiction: 'CA'
    });

    assertArchitecture(caseDef, run);

    summaries.push({
      id: caseDef.id,
      problem: caseDef.problem,
      candidates: run.candidates.length,
      interventionSources: run.sourceSearches.filter(item => item.status !== 'search-failed').length,
      interventionSourceFailures: run.sourceSearches.filter(item => item.status === 'search-failed').map(item => item.sourceId),
      evidenceSearches: run.evidenceSearches.length,
      evidenceLeads: run.evidenceDiscovery.reduce((n, item) => n + (item.evidenceLeads?.length || 0), 0),
      recommendationAllowed: run.governance.recommendationAllowed,
      decisionStatus: run.decision.status,
      discoveryHash: run.discoveryHash,
      runHash: run.runHash
    });
  }

  assert.equal(summaries.length, CASES.length);
  assert.equal(new Set(summaries.map(item => item.id)).size, CASES.length);
  console.log(JSON.stringify({
    validation: 'five-consequential-decisions-v1',
    architecture: 'executeFullCapacityDecision',
    cases: summaries
  }, null, 2));
});
