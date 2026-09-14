'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { executeDecisionDiscovery } = require('../js/decision-discovery-execution');
const { SOURCE_TYPES } = require('../js/decision-discovery-orchestrator');

const SEARCH_TYPES = SOURCE_TYPES.filter(type => type !== 'comparable-city');

function candidate(id, name, problemTags, requiredEvidence = ['causal']) {
  return { id, name, problemTags, requiredEvidence };
}

function completeEvidence(candidateValue) {
  return Object.fromEntries((candidateValue.requiredEvidence || ['causal']).map(type => [type, { status: 'verified' }]));
}

function searchersFor(problemCandidates, overrides = {}) {
  return Object.fromEntries(SEARCH_TYPES.map(type => [type, async () => ({
    sourceId: `${type}-source`,
    jurisdiction: 'Test Municipality',
    candidates: type === 'local-program' ? problemCandidates : []
  }), ...(overrides[type] ? [[type, overrides[type]]] : [])]));
}

async function healthyRun({ problem, candidates, comparableCities = [], analysisInputs = {}, requiredSourceTypes = SOURCE_TYPES, evidenceSearcher }) {
  return executeDecisionDiscovery({
    problem,
    requiredSourceTypes,
    searchers: searchersFor(candidates),
    comparableCities,
    analysisInputs,
    evidenceSearcher: evidenceSearcher || (async ({ candidate: item }) => ({ status: 'searched', evidence: completeEvidence(item), sourceIds: [`evidence-${item.id}`] }))
  });
}

test('real-usage battery covers 12+ arbitrary problem classes without hand-selecting the production registry', async () => {
  const scenarios = [
    ['violent crime', 'reduce violent crime', candidate('violence-interruption', 'Violence interruption', ['violent-crime'])],
    ['homelessness', 'reduce homelessness', candidate('supportive-housing', 'Supportive housing', ['homelessness'])],
    ['traffic injuries', 'reduce traffic injuries', candidate('street-redesign', 'Street redesign', ['traffic-injury'])],
    ['ED overcrowding', 'reduce emergency department overcrowding', candidate('community-paramedicine', 'Community paramedicine', ['overcrowding', 'ems-demand'])],
    ['opioid mortality', 'reduce opioid mortality', candidate('low-barrier-treatment', 'Low-barrier treatment access', ['opioid-mortality'])],
    ['urban heat', 'reduce urban heat exposure', candidate('cool-roofs', 'Cool-roof program', ['urban-heat'])],
    ['library waits', 'reduce library wait times', candidate('mobile-library', 'Mobile library service', ['library-wait-times'])],
    ['business vacancy', 'reduce small-business vacancy', candidate('commercial-revitalization', 'Commercial revitalization grants', ['small-business-vacancy'])],
    ['food insecurity', 'reduce food insecurity', candidate('produce-prescriptions', 'Produce prescription program', ['food-insecurity'])],
    ['air pollution', 'reduce urban air pollution', candidate('clean-air-zones', 'Clean-air zone', ['air-pollution'])],
    ['water loss', 'reduce municipal water loss', candidate('leak-detection', 'Water leak detection', ['water-loss'])],
    ['eviction', 'reduce evictions', candidate('eviction-prevention', 'Eviction prevention legal support', ['eviction'])],
    ['mental health crisis', 'reduce mental health crisis demand', candidate('mobile-crisis', 'Mobile crisis response', ['mental-health-crisis'])],
    ['pedestrian deaths', 'reduce pedestrian deaths', candidate('safe-streets', 'Safe streets redesign', ['pedestrian-safety'])]
  ];

  for (const [label, problem, item] of scenarios) {
    const run = await healthyRun({ problem, candidates: [item], requiredSourceTypes: SEARCH_TYPES });
    assert.ok(run.candidates.some(found => found.id === item.id), `${label}: candidate was not discovered`);
    assert.equal(run.candidates.find(found => found.id === item.id).evidenceState, 'evidence-complete', `${label}: evidence was not complete`);
    assert.equal(run.discoveryAudit.discoverySearchComplete, true, `${label}: discovery did not complete`);
    assert.ok(run.discoveryAudit.candidateUniverseHash, `${label}: candidate universe was not hashed`);
    assert.ok(run.candidates.find(found => found.id === item.id).discovery.provenance.length > 0, `${label}: provenance missing`);
  }
});

test('empty discovery is not silently converted into a recommendation', async () => {
  const run = await healthyRun({ problem: 'reduce asteroid damage to municipal infrastructure', candidates: [], requiredSourceTypes: SEARCH_TYPES });
  assert.equal(run.candidates.length, 0);
  assert.equal(run.discoveryAudit.emptyResult, true);
  assert.equal(run.governance.recommendationAllowed, false);
  assert.equal(run.decision.recommendation, null);
});

test('a failed source blocks the decision even if another source finds a candidate', async () => {
  const run = await executeDecisionDiscovery({
    problem: 'reduce violent crime',
    requiredSourceTypes: SEARCH_TYPES,
    searchers: searchersFor([candidate('violence-interruption', 'Violence interruption', ['violent-crime'])], {
      research: async () => ({ sourceId: 'research-source', status: 'failed', failureReason: 'upstream-timeout', candidates: [] })
    }),
    evidenceSearcher: async ({ candidate: item }) => ({ status: 'searched', evidence: completeEvidence(item) })
  });
  assert.equal(run.discoveryAudit.discoverySearchComplete, false);
  assert.equal(run.governance.recommendationAllowed, false);
  assert.equal(run.decision.recommendation, null);
});

test('an evidence gap blocks recommendation and remains explicitly classified', async () => {
  const run = await healthyRun({
    problem: 'reduce violent crime',
    candidates: [candidate('violence-interruption', 'Violence interruption', ['violent-crime'], ['causal', 'cost'])],
    requiredSourceTypes: SEARCH_TYPES,
    evidenceSearcher: async () => ({ status: 'searched', evidence: { causal: { status: 'verified' } } })
  });
  assert.equal(run.candidates[0].evidenceState, 'evidence-gap');
  assert.deepEqual(run.candidates[0].missingEvidence, ['cost']);
  assert.equal(run.governance.recommendationAllowed, false);
});

test('evidence search status failure fails closed even when the searcher does not throw', async () => {
  const run = await healthyRun({
    problem: 'reduce violent crime',
    candidates: [candidate('violence-interruption', 'Violence interruption', ['violent-crime'])],
    requiredSourceTypes: SEARCH_TYPES,
    evidenceSearcher: async () => ({ status: 'failed', failureReason: 'provider-error', evidence: {} })
  });
  assert.equal(run.evidenceSearches[0].status, 'search-failed');
  assert.equal(run.governance.evidenceSearchComplete, false);
  assert.equal(run.governance.recommendationAllowed, false);
});

test('comparable-city solutions remain transferability leads and never import effects', async () => {
  const run = await healthyRun({
    problem: 'reduce emergency department overcrowding',
    candidates: [],
    comparableCities: [{ city: 'Toronto', problem: 'emergency department overcrowding', interventions: ['community paramedicine'], provenance: { sourceId: 'toronto-source' } }],
    requiredSourceTypes: SOURCE_TYPES
  });
  assert.equal(run.comparableCityLeads.length, 1);
  assert.equal(run.comparableCityLeads[0].leadOnly, true);
  assert.equal(run.comparableCityLeads[0].effectsImported, false);
  assert.equal(run.governance.effectsImportedFromComparableCities, false);
  assert.ok(run.candidates.some(item => item.discovery.comparableCity === 'Toronto'));
});

test('sensitivity flips block recommendation rather than hiding instability', async () => {
  const candidates = [
    candidate('a', 'Option A', ['violent-crime']),
    candidate('b', 'Option B', ['violent-crime'])
  ];
  const run = await healthyRun({
    problem: 'reduce violent crime', candidates, requiredSourceTypes: SEARCH_TYPES,
    analysisInputs: {
      a: { estimate: 10, uncertainty: { low: 2, high: 20 }, voi: 5 },
      b: { estimate: 8, uncertainty: { low: 7, high: 30 }, voi: 4 }
    }
  });
  assert.equal(run.analysis.recommendationFlip, true);
  assert.equal(run.governance.recommendationAllowed, false);
  assert.equal(run.decision.recommendation, null);
});

test('missing quantitative uncertainty blocks recommendation', async () => {
  const item = candidate('a', 'Option A', ['violent-crime']);
  const run = await healthyRun({
    problem: 'reduce violent crime', candidates: [item], requiredSourceTypes: SEARCH_TYPES,
    analysisInputs: { a: { estimate: 10, voi: 5 } }
  });
  assert.equal(run.analysis.status, 'incomplete');
  assert.equal(run.analysis.voi.status, 'not-computable');
  assert.equal(run.governance.recommendationAllowed, false);
});

test('a stable evidence-complete analysis can pass the recommendation gate', async () => {
  const item = candidate('a', 'Option A', ['violent-crime']);
  const run = await healthyRun({
    problem: 'reduce violent crime', candidates: [item], requiredSourceTypes: SEARCH_TYPES,
    analysisInputs: { a: { estimate: 10, uncertainty: { low: 9, high: 11 }, voi: 1 } }
  });
  assert.equal(run.analysis.status, 'complete');
  assert.equal(run.analysis.recommendationFlip, false);
  assert.equal(run.analysis.voi.status, 'complete');
  assert.equal(run.governance.recommendationAllowed, true);
  assert.equal(run.decision.recommendation, 'a');
});

test('duplicate candidates merge provenance instead of creating separate decision options', async () => {
  const duplicate = candidate('same', 'Same intervention', ['violent-crime']);
  const run = await executeDecisionDiscovery({
    problem: 'reduce violent crime', requiredSourceTypes: SEARCH_TYPES,
    searchers: Object.fromEntries(SEARCH_TYPES.map(type => [type, async () => ({ sourceId: `${type}-source`, candidates: type === 'local-program' || type === 'research' ? [duplicate] : [] })])),
    evidenceSearcher: async ({ candidate: item }) => ({ status: 'searched', evidence: completeEvidence(item) })
  });
  const matches = run.candidates.filter(item => item.id === 'same');
  assert.equal(matches.length, 1);
  assert.ok(matches[0].discovery.provenance.length >= 2);
});

test('lexically similar administrative wording cannot create a false intervention match', async () => {
  const run = await healthyRun({
    problem: 'reduce municipal aviation noise',
    candidates: [candidate('fleet', 'Municipal fleet replacement', ['fleet-management'])],
    requiredSourceTypes: SEARCH_TYPES
  });
  assert.equal(run.candidates.length, 0);
  assert.equal(run.governance.recommendationAllowed, false);
});

test('missing source searchers are recorded as not-searched, not searched-empty', async () => {
  const run = await executeDecisionDiscovery({ problem: 'reduce violent crime', requiredSourceTypes: SEARCH_TYPES });
  assert.ok(run.sourceSearches.every(search => search.status === 'not-searched'));
  assert.equal(run.governance.recommendationAllowed, false);
});
