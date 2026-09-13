'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { executeDecisionDiscovery } = require('../js/decision-discovery-execution');
const { SOURCE_TYPES } = require('../js/decision-discovery-orchestrator');

const SEARCH_TYPES = SOURCE_TYPES.filter(type => type !== 'comparable-city');

const makeCandidate = (id, name, problemTags, requiredEvidence = ['causal']) => ({ id, name, problemTags, requiredEvidence });
const evidenceFor = item => Object.fromEntries(item.requiredEvidence.map(type => [type, { status: 'verified' }]));

function allSuccessfulSearchers(items = []) {
  return Object.fromEntries(SEARCH_TYPES.map(type => [type, async () => ({
    sourceId: `${type}-source`, jurisdiction: 'Test Municipality',
    candidates: type === 'local-program' ? items : []
  })]));
}

async function runHealthy(problem, items, options = {}) {
  return executeDecisionDiscovery({
    problem,
    requiredSourceTypes: options.requiredSourceTypes || SEARCH_TYPES,
    searchers: options.searchers || allSuccessfulSearchers(items),
    comparableCities: options.comparableCities || [],
    analysisInputs: options.analysisInputs || {},
    evidenceSearcher: options.evidenceSearcher || (async ({ candidate }) => ({ status: 'searched', evidence: evidenceFor(candidate), sourceIds: [`evidence-${candidate.id}`] }))
  });
}

test('14 arbitrary real-world problem classes can discover and evidence their supplied intervention candidates', async () => {
  const scenarios = [
    ['violent crime', 'reduce violent crime', ['violent-crime']],
    ['homelessness', 'reduce homelessness', ['homelessness']],
    ['traffic injuries', 'reduce traffic injuries', ['traffic-injury']],
    ['ED overcrowding', 'reduce emergency department overcrowding', ['overcrowding']],
    ['opioid mortality', 'reduce opioid mortality', ['opioid-mortality']],
    ['urban heat', 'reduce urban heat exposure', ['urban-heat']],
    ['library wait times', 'reduce library wait times', ['library-wait-times']],
    ['small-business vacancy', 'reduce small-business vacancy', ['small-business-vacancy']],
    ['food insecurity', 'reduce food insecurity', ['food-insecurity']],
    ['air pollution', 'reduce urban air pollution', ['air-pollution']],
    ['municipal water loss', 'reduce municipal water loss', ['water-loss']],
    ['eviction', 'reduce evictions', ['eviction']],
    ['mental-health crisis', 'reduce mental health crisis demand', ['mental-health-crisis']],
    ['pedestrian deaths', 'reduce pedestrian deaths', ['pedestrian-safety']]
  ];
  for (const [label, problem, tags] of scenarios) {
    const item = makeCandidate(`${label}-option`, label, tags);
    const run = await runHealthy(problem, [item]);
    const found = run.candidates.find(candidate => candidate.id === item.id);
    assert.ok(found, `${label}: candidate not discovered`);
    assert.equal(found.evidenceState, 'evidence-complete', `${label}: evidence gap`);
    assert.equal(run.discoveryAudit.discoverySearchComplete, true, `${label}: incomplete discovery`);
    assert.ok(found.discovery.provenance.length > 0, `${label}: missing provenance`);
    assert.match(run.discoveryAudit.candidateUniverseHash, /^[0-9a-f]{64}$/i, `${label}: invalid universe hash`);
  }
});

test('no-candidate problem produces an explicit empty discovery state and no recommendation', async () => {
  const run = await runHealthy('reduce asteroid damage to municipal infrastructure', []);
  assert.equal(run.candidates.length, 0);
  assert.equal(run.discoveryAudit.emptyResult, true);
  assert.equal(run.governance.recommendationAllowed, false);
  assert.equal(run.decision.recommendation, null);
});

test('failed source is not equivalent to empty source and blocks recommendation', async () => {
  const item = makeCandidate('violence-option', 'Violence interruption', ['violent-crime']);
  const searchers = allSuccessfulSearchers([item]);
  searchers.research = async () => ({ sourceId: 'research-source', status: 'failed', failureReason: 'timeout', candidates: [] });
  const run = await runHealthy('reduce violent crime', [item], { searchers });
  const research = run.sourceSearches.find(source => source.sourceId === 'research-source');
  assert.equal(research.status, 'search-failed');
  assert.equal(run.discoveryAudit.discoverySearchComplete, false);
  assert.equal(run.governance.recommendationAllowed, false);
});

test('evidence gap is explicit and blocks recommendation', async () => {
  const item = makeCandidate('violence-option', 'Violence interruption', ['violent-crime'], ['causal', 'cost']);
  const run = await runHealthy('reduce violent crime', [item], {
    evidenceSearcher: async () => ({ status: 'searched', evidence: { causal: { status: 'verified' } } })
  });
  assert.equal(run.candidates[0].evidenceState, 'evidence-gap');
  assert.deepEqual(run.candidates[0].missingEvidence, ['cost']);
  assert.equal(run.governance.recommendationAllowed, false);
});

test('non-throwing evidence search failure fails closed', async () => {
  const item = makeCandidate('violence-option', 'Violence interruption', ['violent-crime']);
  const run = await runHealthy('reduce violent crime', [item], {
    evidenceSearcher: async () => ({ status: 'failed', failureReason: 'provider-error', evidence: {} })
  });
  assert.equal(run.evidenceSearches[0].status, 'search-failed');
  assert.equal(run.governance.evidenceSearchComplete, false);
  assert.equal(run.governance.recommendationAllowed, false);
});

test('throwing evidence search failure fails closed', async () => {
  const item = makeCandidate('violence-option', 'Violence interruption', ['violent-crime']);
  const run = await runHealthy('reduce violent crime', [item], {
    evidenceSearcher: async () => { throw new Error('evidence-timeout'); }
  });
  assert.equal(run.evidenceSearches[0].status, 'search-failed');
  assert.equal(run.candidates[0].evidenceState, 'evidence-gap');
  assert.equal(run.governance.recommendationAllowed, false);
});

test('comparable-city ideas are transferability leads only', async () => {
  const run = await runHealthy('reduce emergency department overcrowding', [], {
    requiredSourceTypes: SOURCE_TYPES,
    comparableCities: [{ city: 'Toronto', problem: 'emergency department overcrowding', interventions: ['community paramedicine'], provenance: { sourceId: 'toronto-source' } }]
  });
  assert.equal(run.comparableCityLeads.length, 1);
  assert.equal(run.comparableCityLeads[0].leadOnly, true);
  assert.equal(run.comparableCityLeads[0].effectsImported, false);
  assert.equal(run.governance.effectsImportedFromComparableCities, false);
});

test('sensitivity flip blocks recommendation', async () => {
  const items = [makeCandidate('a', 'Option A', ['violent-crime']), makeCandidate('b', 'Option B', ['violent-crime'])];
  const run = await runHealthy('reduce violent crime', items, {
    analysisInputs: {
      a: { estimate: 10, uncertainty: { low: 2, high: 20 }, voi: 5 },
      b: { estimate: 8, uncertainty: { low: 7, high: 30 }, voi: 4 }
    }
  });
  assert.equal(run.analysis.recommendationFlip, true);
  assert.equal(run.governance.recommendationAllowed, false);
  assert.equal(run.decision.recommendation, null);
});

test('missing uncertainty blocks recommendation', async () => {
  const item = makeCandidate('a', 'Option A', ['violent-crime']);
  const run = await runHealthy('reduce violent crime', [item], { analysisInputs: { a: { estimate: 10, voi: 1 } } });
  assert.equal(run.analysis.status, 'incomplete');
  assert.equal(run.analysis.voi.status, 'not-computable');
  assert.equal(run.governance.recommendationAllowed, false);
});

test('missing VOI blocks recommendation', async () => {
  const item = makeCandidate('a', 'Option A', ['violent-crime']);
  const run = await runHealthy('reduce violent crime', [item], { analysisInputs: { a: { estimate: 10, uncertainty: { low: 9, high: 11 } } } });
  assert.equal(run.analysis.status, 'complete');
  assert.equal(run.analysis.voi.status, 'not-computable');
  assert.equal(run.governance.recommendationAllowed, false);
});

test('stable evidence-complete candidate can pass all pre-recommendation gates', async () => {
  const item = makeCandidate('a', 'Option A', ['violent-crime']);
  const run = await runHealthy('reduce violent crime', [item], { analysisInputs: { a: { estimate: 10, uncertainty: { low: 9, high: 11 }, voi: 1 } } });
  assert.equal(run.analysis.status, 'complete');
  assert.equal(run.analysis.recommendationFlip, false);
  assert.equal(run.analysis.voi.status, 'complete');
  assert.equal(run.governance.recommendationAllowed, true);
  assert.equal(run.decision.recommendation, 'a');
});

test('duplicate candidates merge provenance', async () => {
  const duplicate = makeCandidate('same', 'Same intervention', ['violent-crime']);
  const searchers = Object.fromEntries(SEARCH_TYPES.map(type => [type, async () => ({
    sourceId: `${type}-source`, candidates: (type === 'local-program' || type === 'research') ? [duplicate] : []
  })]));
  const run = await runHealthy('reduce violent crime', [duplicate], { searchers });
  const matches = run.candidates.filter(item => item.id === 'same');
  assert.equal(matches.length, 1);
  assert.ok(matches[0].discovery.provenance.length >= 2);
});

test('administrative word overlap does not create a false candidate match', async () => {
  const item = makeCandidate('fleet', 'Municipal fleet replacement', ['fleet-management']);
  const run = await runHealthy('reduce municipal aviation noise', [item]);
  assert.equal(run.candidates.length, 0);
  assert.equal(run.governance.recommendationAllowed, false);
});

test('missing searchers are not recorded as searched-empty', async () => {
  const run = await executeDecisionDiscovery({ problem: 'reduce violent crime', requiredSourceTypes: SEARCH_TYPES });
  assert.ok(run.sourceSearches.every(source => source.status === 'not-searched'));
  assert.equal(run.governance.recommendationAllowed, false);
});

test('comparable-city-only discovery cannot become a recommendation without local evidence analysis', async () => {
  const run = await runHealthy('reduce emergency department overcrowding', [], {
    requiredSourceTypes: SOURCE_TYPES,
    comparableCities: [{ city: 'Melbourne', problem: 'emergency department overcrowding', interventions: ['community paramedicine'] }]
  });
  assert.equal(run.governance.effectsImportedFromComparableCities, false);
  assert.equal(run.decision.recommendation, null);
});
