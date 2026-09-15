'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { executeDecisionDiscovery } = require('../js/decision-discovery-execution');

const CANDIDATES = [
  ['violence-interruption', 'Community violence interruption'],
  ['focused-deterrence', 'Focused deterrence'],
  ['vacant-lot-remediation', 'Place-based vacant-lot remediation'],
  ['youth-employment', 'Youth employment and training'],
  ['summer-youth-programming', 'Summer youth programming'],
  ['hospital-community-partnership', 'Hospital-community violence partnership'],
  ['street-lighting', 'Targeted street-lighting improvements'],
  ['neighbourhood-greening', 'Neighbourhood greening and place improvement'],
  ['safe-passage', 'Safe-passage and violence-prevention corridors'],
  ['trauma-recovery', 'Community trauma recovery services'],
  ['credible-messengers', 'Credible-messenger outreach'],
  ['high-risk-youth-support', 'High-risk youth intensive support']
].map(([id, name]) => ({
  id,
  name,
  problemTags: ['violent-crime'],
  domains: ['public-safety'],
  requiredEvidence: ['causal', 'implementation'],
  discoveryText: `${name} intervention for reducing violent crime.`
}));

function evidenceFor(candidate) {
  return {
    candidateId: candidate.id,
    evidenceComplete: true,
    evidence: {
      causal: { status: 'supported' },
      implementation: { status: 'supported' }
    },
    sourceIds: ['openalex', 'pubmed']
  };
}

test('blind discovery preserves the full legitimate intervention universe without an arbitrary cap', async () => {
  const analysisInputs = Object.fromEntries(CANDIDATES.map((candidate, index) => [candidate.id, {
    evidenceScore: index === 0 ? 9 : 4 + (index % 3),
    feasibility: index === 0 ? 8 : 3 + (index % 2),
    benefit: index === 0 ? 9 : 4,
    uncertaintyPenalty: index === 0 ? 1 : 2,
    estimate: index === 0 ? 10 : 5,
    uncertainty: { low: index === 0 ? 9 : 3, high: index === 0 ? 11 : 7 },
    voi: 0
  }]));

  const result = await executeDecisionDiscovery({
    problem: 'reduce violent crime',
    discoveryJurisdiction: 'CA',
    requiredSourceTypes: ['intervention-library'],
    statusQuo: { explicit: true, id: 'status-quo', description: 'Continue current practice' },
    searchers: {
      'intervention-library': async () => ({
        sourceId: 'blind-large-intervention-universe',
        sourceType: 'intervention-library',
        jurisdiction: 'CA',
        status: 'candidates-found',
        candidates: CANDIDATES
      })
    },
    evidenceSearcher: async ({ candidate }) => evidenceFor(candidate),
    analysisInputs,
    decisionContext: { outcomeObservations: [] }
  });

  const discoveredIds = new Set(result.candidates.map(candidate => candidate.id));
  for (const candidate of CANDIDATES) assert.ok(discoveredIds.has(candidate.id), `legitimate candidate was dropped: ${candidate.id}`);

  assert.equal(result.candidates.length, CANDIDATES.length);
  assert.equal(result.evidenceSearches.length, CANDIDATES.length);
  assert.ok(result.evidenceSearches.every(search => search.status !== 'search-failed'));

  const universe = result.governance.candidateUniverseIntelligence;
  assert.equal(universe.candidatesConsidered, CANDIDATES.length);
  assert.equal(universe.uniqueCandidateNames, CANDIDATES.length);
  assert.equal(universe.duplicateCandidateGroups, 0);
  assert.equal(universe.provenanceGaps.length, 0);
  assert.equal(universe.status, 'universe-found');

  const ranking = result.intelligence.ranking;
  assert.equal(ranking.length, CANDIDATES.length);
  assert.deepEqual(new Set(ranking.map(item => item.candidateId)), discoveredIds);
  assert.equal(ranking[0].candidateId, 'violence-interruption');
  assert.ok(ranking.every(item => item.recommendationEligible === true));

  // Discovery breadth is independent of presentation/ranking: ranking may prioritize candidates,
  // but it must not delete legitimate lower-ranked interventions from the decision universe.
  assert.ok(ranking.some(item => item.candidateId === 'high-risk-youth-support'));
  assert.ok(ranking.find(item => item.candidateId === 'high-risk-youth-support').score < ranking[0].score);

  // The decision layer may choose one option, but discovery must preserve every validated candidate.
  assert.ok(result.governance.decisionArtifacts);
  assert.equal(Object.keys(result.governance.decisionArtifacts).length, CANDIDATES.length);
});
