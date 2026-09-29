'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  extractCkanInterventionLeads,
  extractGovUkInterventionLeads,
  buildDiscoveryQueryPlan,
  interventionMatchesProblem
} = require('../js/source-driven-intervention-discovery');

const source = {
  sourceId: 'us-open-data-program-discovery',
  jurisdiction: 'US',
  domain: 'government-programs',
  url: 'https://example.invalid/api/3/action/package_search'
};

test('diagnostic extraction recovers interventions embedded in otherwise record-like CKAN titles', () => {
  const payload = {
    result: { results: [{
      id: 'x1',
      title: 'Home Weatherization Assistance Program evaluation data',
      notes: 'The program provides home weatherization and energy efficiency retrofits for low-income households.'
    }] }
  };
  const leads = extractCkanInterventionLeads(payload, source, 'reduce residential energy burden', 'municipal');
  assert.ok(leads.some(x => /weatherization/i.test(x.name)), JSON.stringify(leads));
  assert.ok(leads.some(x => interventionMatchesProblem('reduce residential energy burden', x, 'municipal')));
});

test('diagnostic extraction recovers interventions from GOV.UK record-like result titles via descriptions', () => {
  const govSource = { sourceId: 'uk-gov-program-discovery', jurisdiction: 'UK', domain: 'government-programs', url: 'https://example.invalid/api/search' };
  const payload = { results: [{
    title: 'Eviction prevention service evaluation data',
    description: 'The service provides tenant legal assistance and housing navigation to prevent eviction.',
    link: 'https://example.invalid/1'
  }] };
  const leads = extractGovUkInterventionLeads(payload, govSource, 'reduce eviction filings', 'municipal');
  assert.ok(leads.some(x => /tenant legal assistance|housing navigation/i.test(x.name)), JSON.stringify(leads));
});

test('family discovery uses source-searchable intervention anchors instead of requiring the full problem phrase', () => {
  const plan = buildDiscoveryQueryPlan('reduce residential energy burden', 'municipal');
  assert.ok(plan.some(x => x.query === 'home weatherization'), JSON.stringify(plan));
  assert.ok(plan.some(x => x.queryLayer === 'family-expansion'), JSON.stringify(plan));
});
