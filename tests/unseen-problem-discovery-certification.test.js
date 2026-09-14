'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { executeDecisionDiscovery } = require('../js/decision-discovery-execution');

// These problems deliberately use candidate IDs that do not exist in the fallback
// registry. The certification therefore proves the execution path can construct a
// candidate universe from searched sources rather than relying on demo candidates.
const PROBLEMS = [
  ['opioid-mortality', 'overdose deaths'],
  ['food-insecurity', 'food insecurity'],
  ['flood-risk', 'urban flooding'],
  ['domestic-violence', 'domestic violence'],
  ['youth-unemployment', 'youth unemployment'],
  ['extreme-cold', 'extreme cold exposure'],
  ['air-pollution', 'air pollution'],
  ['social-isolation', 'social isolation'],
  ['eviction', 'eviction pressure'],
  ['wildfire-smoke', 'wildfire smoke exposure'],
  ['maternal-health', 'maternal health'],
  ['public-transit-access', 'public transit access']
];

function candidate(id, name, tag, sourceType) {
  return {
    id,
    name,
    problemTags: [tag],
    domains: ['test-domain'],
    requiredEvidence: ['causal', 'implementation'],
    discovery: { source: `cert-${sourceType}`, sourceType }
  };
}

function searchersFor(problemTag) {
  return {
    'local-program': async () => ({
      sourceId: 'cert-local',
      candidates: [candidate(`local-${problemTag}`, `Local ${problemTag} program`, problemTag, 'local-program')]
    }),
    'official-data': async () => ({
      sourceId: 'cert-official',
      candidates: []
    }),
    research: async () => ({
      sourceId: 'cert-research',
      candidates: [candidate(`research-${problemTag}`, `Research-derived ${problemTag} intervention`, problemTag, 'research')]
    }),
    'intervention-library': async () => ({
      sourceId: 'cert-library',
      candidates: [candidate(`library-${problemTag}`, `Library ${problemTag} intervention`, problemTag, 'intervention-library')]
    })
  };
}

test('unseen-problem discovery constructs source-backed candidate universes', async () => {
  for (const [problemTag, problem] of PROBLEMS) {
    const run = await executeDecisionDiscovery({
      problem,
      requiredSourceTypes: ['local-program', 'official-data', 'research', 'intervention-library'],
      searchers: searchersFor(problemTag),
      statusQuo: { explicit: true, id: `status-quo-${problemTag}` }
    });

    assert.equal(run.discoveryAudit.discoverySearchComplete, true, `${problem}: source search should complete`);
    assert.equal(run.discoveryAudit.emptyResult, false, `${problem}: discovery must not be empty`);
    assert.equal(run.discoveryAudit.candidatesMatched >= 3, true, `${problem}: must produce a real candidate universe`);
    assert.equal(run.discoveryAudit.evidenceCoverage.total, run.candidates.length);
    assert.equal(run.discoveryAudit.candidateUniverseHash.length, 64);
    assert.equal(run.governance.sourceSearchFailures.length, 0);
    assert.equal(run.governance.unsearchedSourceTypes.length, 0);

    // Evidence is intentionally absent: discovery succeeds, but recommendation must
    // remain blocked. Unknown evidence is not silently converted to zero effect.
    assert.equal(run.candidates.every(candidate => candidate.evidenceState === 'evidence-gap'), true);
    assert.equal(run.governance.recommendationAllowed, false);
    assert.equal(run.decision.status, 'recommendation-blocked');
  }
});

test('unseen-problem discovery remains failure-closed when one acquisition source fails', async () => {
  const run = await executeDecisionDiscovery({
    problem: 'food insecurity',
    requiredSourceTypes: ['local-program', 'official-data', 'research', 'intervention-library'],
    searchers: {
      ...searchersFor('food-insecurity'),
      research: async () => { throw new Error('research provider unavailable'); }
    },
    statusQuo: { explicit: true, id: 'status-quo-food-insecurity' }
  });

  assert.equal(run.discoveryAudit.discoverySearchComplete, false);
  assert.deepEqual(run.governance.sourceSearchFailures, ['research']);
  assert.equal(run.governance.recommendationAllowed, false);
  assert.equal(run.decision.recommendation, null);
  assert.ok(run.candidates.some(candidate => candidate.id === 'local-food-insecurity'));
  assert.ok(run.candidates.some(candidate => candidate.id === 'library-food-insecurity'));
});

test('unseen-problem discovery preserves comparable-city ideas as non-causal leads', async () => {
  const run = await executeDecisionDiscovery({
    problem: 'urban flooding',
    requiredSourceTypes: ['local-program', 'research', 'comparable-city'],
    searchers: {
      'local-program': async () => ({ candidates: [candidate('local-flood', 'Local flood retention program', 'flood-risk', 'local-program')] }),
      research: async () => ({ candidates: [] })
    },
    comparableCities: [
      { city: 'Comparable City A', problem: 'urban flooding', interventions: 'stormwater retention', provenance: { sourceId: 'city-a' } },
      { city: 'Comparable City B', problem: 'urban flooding', interventions: 'permeable streets', provenance: { sourceId: 'city-b' } }
    ],
    statusQuo: { explicit: true, id: 'status-quo-flood-risk' }
  });

  assert.equal(run.governance.effectsImportedFromComparableCities, false);
  assert.equal(run.comparableCityLeads.length, 2);
  assert.equal(run.comparableCityLeads.every(lead => lead.leadOnly && lead.effectsImported === false), true);
  assert.equal(run.candidates.some(candidate => candidate.discovery?.sourceType === 'comparable-city'), true);
});

console.log('unseen-problem discovery certification passed');
