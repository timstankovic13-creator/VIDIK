'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { buildCkanSearchUrl, extractCkanInterventionLeads, discoverSourceDrivenInterventions } = require('../js/source-driven-intervention-discovery');
const { executeDecisionDiscovery } = require('../js/decision-discovery-execution');

const SOURCE = {
  sourceId: 'ca-program-discovery', provider: 'Government of Canada Open Government Portal', jurisdiction: 'CA',
  domain: 'intervention-universe', tier: 'official_machine_readable', accessMethod: 'ckan-action-api',
  url: 'https://open.canada.ca/data/en/api/3/action/package_search?q='
};

function mockResponse(value) {
  const bytes = Buffer.from(JSON.stringify(value));
  return { ok: true, status: 200, headers: { get: key => key === 'content-type' ? 'application/json' : null }, arrayBuffer: async () => bytes };
}

test('CKAN discovery creates potential leads with provenance and no imported effects', async () => {
  const result = await discoverSourceDrivenInterventions({
    problem: 'food insecurity', sources: [SOURCE], fetchImpl: async () => mockResponse({ result: { results: [
      { id: 'food-program-1', title: 'Community food access program', notes: 'Local food support and access.', tags: [{ name: 'food' }, { name: 'poverty' }] }
    ] } })
  });
  assert.equal(result.candidates.length, 1);
  const lead = result.candidates[0];
  assert.equal(lead.evidenceStatus, 'potential');
  assert.equal(lead.discovery.discoveryOnly, true);
  assert.equal(lead.discovery.effectsImported, false);
  assert.equal(lead.discovery.provenance[0].sourceId, SOURCE.sourceId);
  assert.equal(result.recommendationEligible, false);
  assert.equal(result.sourceSearches[0].status, 'candidates-found');
});

test('source-driven discovery is wired into decision execution and remains evidence-gated', async () => {
  const run = await executeDecisionDiscovery({
    problem: 'food insecurity',
    requiredSourceTypes: ['intervention-library'],
    autoDiscoverInterventionSources: true,
    fetchImpl: async () => mockResponse({ result: { results: [
      { id: 'food-program-2', title: 'Municipal food access program', notes: 'Food access intervention.' }
    ] } }),
    statusQuo: { explicit: true, id: 'status-quo-food' }
  });
  assert.equal(run.candidates.length, 1);
  assert.equal(run.candidates[0].discovery.sourceType, 'intervention-library');
  assert.equal(run.candidates[0].discovery.effectsImported, false);
  assert.equal(run.candidates[0].evidenceState, 'evidence-gap');
  assert.equal(run.governance.recommendationAllowed, false);
});

test('source-driven discovery records upstream failure instead of inventing an empty result', async () => {
  const result = await discoverSourceDrivenInterventions({ problem: 'urban flooding', sources: [SOURCE], fetchImpl: async () => mockResponse({ error: true }) });
  assert.equal(result.sourceSearches[0].status, 'searched-empty');
  assert.equal(result.candidates.length, 0);
});

test('CKAN query construction remains HTTPS and bounded', () => {
  const url = new URL(buildCkanSearchUrl(SOURCE, 'reduce violent crime', { rows: 25 }));
  assert.equal(url.protocol, 'https:');
  assert.equal(url.searchParams.get('q'), 'reduce violent crime');
  assert.equal(url.searchParams.get('rows'), '25');
  assert.throws(() => buildCkanSearchUrl(SOURCE, 'crime', { rows: 101 }), /page-size-invalid/);
});
