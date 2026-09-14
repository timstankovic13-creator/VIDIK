'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { executeDecisionDiscovery } = require('../js/decision-discovery-execution');

const DOMAINS = [
  'reduce violent crime', 'reduce opioid mortality', 'reduce food insecurity', 'reduce urban flooding',
  'reduce domestic violence', 'reduce youth unemployment', 'reduce extreme cold deaths', 'reduce air pollution',
  'reduce social isolation', 'reduce eviction', 'reduce wildfire smoke exposure', 'improve maternal health',
  'improve public transit access', 'reduce homelessness', 'reduce emergency department overcrowding',
  'reduce pedestrian injuries', 'improve drinking water reliability', 'reduce heat mortality',
  'reduce school absenteeism', 'reduce newcomer unemployment', 'reduce rural ambulance delays',
  'reduce household energy insecurity', 'improve disability access', 'reduce seniors falls'
];

function healthySearchers(problem) {
  return {
    'local-program': async () => ({ sourceId: 'local', candidates: [{ id: `local:${problem}`, name: `Evidence-backed lead for ${problem}`, problemTags: problem.split(' '), requiredEvidence: ['causal'] }] }),
    'official-data': async () => ({ sourceId: 'official', candidates: [] }),
    research: async () => ({ sourceId: 'research', candidates: [] }),
    'intervention-library': async () => ({ sourceId: 'library', candidates: [] })
  };
}

function healthyEvidence({ candidate }) {
  return {
    sourceIds: ['independent-causal-source'],
    evidence: { causal: { status: 'supported', sourceIds: ['independent-causal-source'], causalIdentified: true } }
  };
}

function healthyAnalysis(candidateId) {
  return { [candidateId]: { estimate: 10, uncertainty: { low: 8, high: 12 }, voi: 1 } };
}

test('monster gate: arbitrary problems traverse discovery → evidence → uncertainty/VOI → learning/audit without demo registry dependency', async () => {
  for (const problem of DOMAINS) {
    const run = await executeDecisionDiscovery({
      problem,
      requiredSourceTypes: ['local-program', 'official-data', 'research', 'intervention-library'],
      searchers: healthySearchers(problem),
      evidenceSearcher: healthyEvidence,
      statusQuo: { explicit: true, description: 'continue current service level' },
      analysisInputs: {},
      decisionContext: { resourceUnit: 'CAD', resourceCurrency: 'CAD' }
    });

    const candidateId = run.candidates[0]?.id;
    assert.ok(candidateId, `${problem}: candidate universe empty`);
    const analyzedRun = await executeDecisionDiscovery({
      problem,
      requiredSourceTypes: ['local-program', 'official-data', 'research', 'intervention-library'],
      searchers: healthySearchers(problem),
      evidenceSearcher: healthyEvidence,
      statusQuo: { explicit: true, description: 'continue current service level' },
      analysisInputs: healthyAnalysis(candidateId),
      decisionContext: { resourceUnit: 'CAD', resourceCurrency: 'CAD' }
    });

    assert.equal(analyzedRun.discoveryAudit.discoverySearchComplete, true, `${problem}: discovery incomplete`);
    assert.equal(analyzedRun.evidenceSearches.every(item => item.status !== 'search-failed'), true, `${problem}: evidence search failed`);
    assert.equal(analyzedRun.candidates[0].evidenceState, 'evidence-complete', `${problem}: evidence gate did not close`);
    assert.equal(analyzedRun.governance.whyNotAvailable, true);
    assert.equal(analyzedRun.governance.knowledgeGraphPresent, true);
    assert.ok(analyzedRun.governance.learningEnvelope);
    assert.ok(analyzedRun.runHash && /^[a-f0-9]{64}$/.test(analyzedRun.runHash));
  }
});

test('monster gate: evidence failure blocks recommendation and preserves failure provenance', async () => {
  const run = await executeDecisionDiscovery({
    problem: 'reduce violent crime',
    requiredSourceTypes: ['local-program', 'official-data', 'research', 'intervention-library'],
    searchers: healthySearchers('reduce violent crime'),
    evidenceSearcher: async () => { throw new Error('independent-evidence-timeout'); },
    statusQuo: { explicit: true, description: 'continue current service level' }
  });
  assert.equal(run.evidenceSearches[0].status, 'search-failed');
  assert.equal(run.governance.evidenceSearchComplete, false);
  assert.equal(run.governance.recommendationAllowed, false);
  assert.equal(run.decision.recommendation, null);
});

test('monster gate: comparable-city learning remains lead-only and cannot import effects', async () => {
  const run = await executeDecisionDiscovery({
    problem: 'reduce emergency department overcrowding',
    requiredSourceTypes: ['local-program', 'research', 'comparable-city'],
    searchers: {
      'local-program': async () => ({ candidates: [] }),
      research: async () => ({ candidates: [] })
    },
    comparableCities: [{ city: 'Toronto', problem: 'emergency department overcrowding', interventions: ['community paramedicine'], provenance: { sourceId: 'toronto-outcomes' } }]
  });
  assert.equal(run.comparableCityLeads[0].leadOnly, true);
  assert.equal(run.comparableCityLeads[0].effectsImported, false);
  assert.equal(run.governance.effectsImportedFromComparableCities, false);
});
