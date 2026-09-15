'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { discoverSourceDrivenInterventions } = require('../js/source-driven-intervention-discovery');

const SOURCE = {
  sourceId: 'ca-program-discovery',
  provider: 'Government of Canada Open Government Portal',
  jurisdiction: 'CA',
  domain: 'intervention-universe',
  tier: 'official_machine_readable',
  accessMethod: 'ckan-action-api',
  url: 'https://open.canada.ca/data/en/api/3/action/package_search?q=',
  discoveryTags: ['programs', 'health']
};

function mockFetch(payload) {
  return async () => ({
    ok: true,
    status: 200,
    headers: { get(name) { return name.toLowerCase() === 'content-type' ? 'application/json' : null; } },
    async arrayBuffer() { return Buffer.from(JSON.stringify(payload)); }
  });
}

test('outsider audit: arbitrary dataset rows must not masquerade as interventions', async () => {
  const result = await discoverSourceDrivenInterventions({
    problem: 'reduce loneliness among older adults',
    jurisdiction: 'CA',
    sources: [SOURCE],
    rows: 10,
    fetchImpl: mockFetch({
      success: true,
      result: { results: [
        { id: 'dataset-1', title: 'Older Adult Population Census Data', notes: 'Population counts by age and geography.' },
        { id: 'dataset-2', title: 'Emergency Department Visits', notes: 'Administrative health utilization dataset.' },
        { id: 'dataset-3', title: 'Municipal Budget Open Data', notes: 'Annual expenditures by department.' }
      ] }
    })
  });

  assert.equal(result.recommendationEligible, false);
  assert.equal(result.sourceSearches.length, 1);
  assert.equal(result.sourceSearches[0].status, 'searched-empty', 'non-intervention datasets must not become intervention leads');
  assert.equal(result.candidates.length, 0, 'VIDIK must distinguish intervention records from merely relevant datasets');
});

test('outsider audit: malformed intervention rows fail closed rather than becoming weak leads', async () => {
  const result = await discoverSourceDrivenInterventions({
    problem: 'reduce basement flooding from extreme rainfall',
    jurisdiction: 'CA',
    sources: [SOURCE],
    rows: 10,
    fetchImpl: mockFetch({ success: true, result: { results: [
      { id: 'blank', title: '', notes: '' },
      { id: 'vague', title: 'Climate Information', notes: 'General information.' }
    ] } })
  });

  assert.equal(result.recommendationEligible, false);
  assert.equal(result.candidates.length, 0);
  assert.ok(result.discoveryHash);
  assert.equal(result.sourceSearches[0].status, 'searched-empty');
});
