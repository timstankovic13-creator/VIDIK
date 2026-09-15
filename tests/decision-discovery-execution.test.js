'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { executeDecisionDiscovery, executeFullCapacityDecision, normalizeDiscoveryJurisdiction } = require('../js/decision-discovery-execution');
const { SOURCE_TYPES } = require('../js/decision-discovery-orchestrator');

function response(value) {
  const bytes = Buffer.from(JSON.stringify(value));
  return { ok: true, status: 200, headers: { get(name) { return name.toLowerCase() === 'content-type' ? 'application/json' : String(bytes.length); } }, async arrayBuffer() { return bytes; } };
}

function fakeFetch(url) {
  const parsed = new URL(url);
  if (parsed.hostname === 'open.canada.ca' || parsed.hostname === 'data.ontario.ca') {
    return Promise.resolve(response({ success: true, result: { results: [
      { id: 'worker-transition-service', title: 'Worker transition training and employment service', notes: 'Employment training and placement support for workers displaced by automation', tags: [{ display_name: 'employment' }, { display_name: 'training' }] },
      { id: 'worker-data', title: 'Worker displacement statistics dataset', notes: 'Administrative records and statistics', tags: [{ display_name: 'data' }] }
    ] } }));
  }
  if (parsed.hostname === 'api.openalex.org') return Promise.resolve(response({ results: [{ id: 'https://openalex.org/W1', display_name: 'Evaluation of worker retraining and employment support after technological displacement' }] }));
  if (parsed.hostname === 'eutils.ncbi.nlm.nih.gov') return Promise.resolve(response({ esearchresult: { idlist: ['12345678'] } }));
  return Promise.reject(new Error(`unexpected-upstream:${parsed.hostname}`));
}

test('execution searches each source and records empty, failed, and successful states', async () => {
  const run = await executeDecisionDiscovery({
    problem: 'reduce violent crime',
    requiredSourceTypes: SOURCE_TYPES,
    searchers: {
      'local-program': async () => ({ sourceId: 'local', candidates: [{ id: 'local-a', name: 'Violence interruption', problemTags: ['violent-crime'], requiredEvidence: ['causal'] }] }),
      'official-data': async () => ({ sourceId: 'official', candidates: [] }),
      research: async () => { throw new Error('research-timeout'); },
      'intervention-library': async () => ({ sourceId: 'library', candidates: [{ id: 'library-a', name: 'Focused violence response', problemTags: ['violent-crime'], requiredEvidence: ['causal'] }] })
    }
  });
  assert.equal(run.discoveryAudit.sourceSearches.find(s => s.sourceId === 'official').status, 'searched-empty');
  assert.equal(run.discoveryAudit.sourceSearches.find(s => s.sourceId === 'research').status, 'search-failed');
  assert.equal(run.discoveryAudit.discoverySearchComplete, false);
  assert.deepEqual(run.governance.sourceSearchFailures, ['research']);
  assert.equal(run.governance.recommendationAllowed, false);
});

test('execution searches evidence for every discovered candidate and fails closed on evidence errors', async () => {
  const calls = [];
  const run = await executeDecisionDiscovery({
    problem: 'reduce violent crime',
    requiredSourceTypes: SOURCE_TYPES,
    searchers: Object.fromEntries(SOURCE_TYPES.filter(type => type !== 'comparable-city').map(type => [type, async () => ({ sourceId: type, candidates: type === 'local-program' ? [{ id: 'a', name: 'Violence interruption', problemTags: ['violent-crime'], requiredEvidence: ['causal'] }] : [] })])),
    evidenceSearcher: async ({ candidate }) => { calls.push(candidate.id); throw new Error('evidence-upstream-failed'); }
  });
  assert.deepEqual(calls, ['a']);
  assert.equal(run.evidenceSearches.length, 1);
  assert.equal(run.evidenceSearches[0].status, 'search-failed');
  assert.equal(run.candidates[0].evidenceState, 'evidence-gap');
  assert.equal(run.governance.evidenceSearchComplete, false);
  assert.equal(run.governance.recommendationAllowed, false);
});

test('execution preserves comparable-city ideas as leads only', async () => {
  const run = await executeDecisionDiscovery({
    problem: 'reduce emergency department overcrowding',
    requiredSourceTypes: ['local-program', 'research', 'comparable-city'],
    searchers: { 'local-program': async () => ({ candidates: [] }), research: async () => ({ candidates: [] }) },
    comparableCities: [{ city: 'Toronto', problem: 'emergency department overcrowding', interventions: 'community paramedicine' }]
  });
  assert.equal(run.comparableCityLeads.length, 1);
  assert.equal(run.comparableCityLeads[0].leadOnly, true);
  assert.equal(run.comparableCityLeads[0].effectsImported, false);
  assert.equal(run.governance.effectsImportedFromComparableCities, false);
});

test('execution does not convert missing searchers into an empty search', async () => {
  const run = await executeDecisionDiscovery({ problem: 'improve library wait times', requiredSourceTypes: ['local-program', 'official-data', 'research', 'intervention-library'] });
  assert.ok(run.sourceSearches.every(search => search.status === 'not-searched'));
  assert.equal(run.governance.recommendationAllowed, false);
  assert.deepEqual(run.governance.unsearchedSourceTypes.sort(), ['intervention-library', 'local-program', 'official-data', 'research'].sort());
});

test('full-capacity execution automatically discovers a novel intervention universe and evidence leads', async () => {
  assert.equal(normalizeDiscoveryJurisdiction('Ottawa, Canada'), 'CA');
  const run = await executeFullCapacityDecision({
    problem: 'worker displacement from automation',
    requiredSourceTypes: ['intervention-library'],
    fetchImpl: fakeFetch,
    statusQuo: { explicit: true, description: 'current workforce-support approach' },
    decisionContext: { jurisdiction: 'Ottawa, Canada' }
  });
  assert.ok(run.candidates.length >= 1);
  assert.ok(run.candidates.some(candidate => /worker transition/i.test(candidate.name)));
  assert.ok(run.evidenceDiscovery.length >= 1);
  assert.ok(run.evidenceDiscovery.some(item => item.evidenceLeads?.length));
  assert.equal(run.governance.learningEffectsImported, false);
  assert.equal(run.governance.recommendationAllowed, false);
  assert.equal(run.decision.recommendation, null);
});

test('full-capacity discovery does not promote a data-only record into an intervention', async () => {
  const run = await executeFullCapacityDecision({
    problem: 'worker displacement from automation',
    requiredSourceTypes: ['intervention-library'],
    fetchImpl: fakeFetch,
    statusQuo: { explicit: true },
    decisionContext: { jurisdiction: 'Canada' }
  });
  assert.ok(run.candidates.every(candidate => !/statistics dataset/i.test(candidate.name)));
});
