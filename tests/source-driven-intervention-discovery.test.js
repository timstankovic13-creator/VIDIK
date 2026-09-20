'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { taxonomyTerms, buildCkanSearchUrl, buildGovUkSearchUrl, extractCkanInterventionLeads, extractGovUkInterventionLeads, discoverSourceDrivenInterventions } = require('../js/source-driven-intervention-discovery');
const { executeDecisionDiscovery } = require('../js/decision-discovery-execution');

const GOVUK_SOURCE = {
  sourceId: 'uk-gov-program-discovery', provider: 'GOV.UK Search API', jurisdiction: 'UK',
  domain: 'intervention-universe', tier: 'official_machine_readable', accessMethod: 'govuk-search-api',
  url: 'https://www.gov.uk/api/search.json'
};

const SOURCE = {
  sourceId: 'ca-program-discovery', provider: 'Government of Canada Open Government Portal', jurisdiction: 'CA',
  domain: 'intervention-universe', tier: 'official_machine_readable', accessMethod: 'ckan-action-api',
  url: 'https://open.canada.ca/data/en/api/3/action/package_search?q='
};

function mockResponse(value) {
  const bytes = Buffer.from(JSON.stringify(value));
  return { ok: true, status: 200, headers: { get: key => key === 'content-type' ? 'application/json' : null }, arrayBuffer: async () => bytes };
}

test('GOV.UK discovery extracts official intervention-program leads without importing effects', () => {
  const leads = extractGovUkInterventionLeads({ results: [
    { title: 'Digital Inclusion Innovation Fund', description: 'Funding for local digital inclusion interventions and projects.', link: '/government/publications/digital-inclusion-innovation-fund', format: 'guidance' }
  ] }, GOVUK_SOURCE, 'reduce digital access gaps', 'municipal');
  assert.equal(leads.length, 1);
  assert.equal(leads[0].name, 'Digital Inclusion Innovation Fund');
  assert.equal(leads[0].discovery.leadOnly, true);
  assert.equal(leads[0].discovery.effectsImported, false);
  assert.equal(leads[0].discovery.provenance[0].sourceId, GOVUK_SOURCE.sourceId);
});

test('GOV.UK extraction recognizes schemes and funds when the intervention is described by the official page', () => {
  const leads = extractGovUkInterventionLeads({ results: [
    { title: 'Gigabit Broadband Voucher Scheme', description: 'A voucher scheme that funds eligible broadband installation for local premises.', link: '/guidance/gigabit-broadband-voucher-scheme', format: 'guidance' },
    { title: 'Digital Inclusion Action Plan', description: 'A government action plan for improving digital inclusion and access.', link: '/government/publications/digital-inclusion-action-plan', format: 'policy' }
  ] }, GOVUK_SOURCE, 'reduce digital access gaps', 'municipal');
  assert.equal(leads.length, 2);
  assert.deepEqual(leads.map(lead => lead.name), ['Gigabit Broadband Voucher Scheme', 'Digital Inclusion Action Plan']);
});

test('digital-access taxonomy expands into concrete intervention queries', () => {
  const terms = taxonomyTerms('reduce digital access gaps', 'municipal');
  assert.ok(terms.includes('digital inclusion'));
  assert.ok(terms.includes('broadband voucher scheme'));
  assert.ok(terms.includes('digital lifeline fund'));
});

test('GOV.UK query construction remains HTTPS and bounded', () => {
  const url = new URL(buildGovUkSearchUrl(GOVUK_SOURCE, 'digital inclusion', { rows: 10 }));
  assert.equal(url.protocol, 'https:');
  assert.equal(url.searchParams.get('q'), 'digital inclusion');
  assert.equal(url.searchParams.get('count'), '10');
  assert.throws(() => buildGovUkSearchUrl(GOVUK_SOURCE, 'digital inclusion', { rows: 101 }), /page-size-invalid/);
});

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
