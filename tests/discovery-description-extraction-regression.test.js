'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { extractCkanInterventionLeads, extractGovUkInterventionLeads } = require('../js/source-driven-intervention-discovery');

const CKAN_SOURCE = {
  sourceId: 'ca-program-discovery', provider: 'Government of Canada Open Government Portal',
  jurisdiction: 'CA', domain: 'intervention-universe', tier: 'official_machine_readable',
  accessMethod: 'ckan-action-api', url: 'https://open.canada.ca/data/en/api/3/action/package_search?q='
};
const GOVUK_SOURCE = {
  sourceId: 'uk-gov-program-discovery', provider: 'GOV.UK Search API',
  jurisdiction: 'UK', domain: 'intervention-universe', tier: 'official_machine_readable',
  accessMethod: 'govuk-search-api', url: 'https://www.gov.uk/api/search.json'
};

test('CKAN description extraction is not blocked by a record-like title when the extracted intervention is controlled', () => {
  const leads = extractCkanInterventionLeads({
    result: { results: [{
      id: 'pedestrian-study',
      title: 'Pedestrian safety evaluation report',
      notes: 'The intervention implemented traffic calming, protected bike lanes and pedestrian crossings around high-injury corridors.'
    }] }
  }, CKAN_SOURCE, 'reduce pedestrian injuries', 'municipal');
  assert.ok(leads.some(lead => /traffic calming|protected bike lane|pedestrian crossing/i.test(lead.name)));
  assert.ok(leads.every(lead => lead.discovery.classification.basis === 'description-extracted-intervention'));
});

test('GOV.UK description extraction is not blocked by a record-like title when the extracted intervention is controlled', () => {
  const leads = extractGovUkInterventionLeads({
    results: [{
      title: 'Wildfire smoke assessment report',
      description: 'The programme installed smoke filtration and established clean air shelters for exposed communities.',
      link: '/wildfire-smoke-assessment',
      format: 'report'
    }]
  }, GOVUK_SOURCE, 'reduce wildfire smoke exposure', 'municipal');
  assert.ok(leads.some(lead => /smoke filtration|clean air shelter/i.test(lead.name)));
  assert.ok(leads.every(lead => lead.discovery.classification.basis === 'description-extracted-intervention'));
});

test('record-like titles without a controlled executable intervention remain rejected', () => {
  const leads = extractCkanInterventionLeads({
    result: { results: [{
      id: 'generic-report',
      title: 'Pedestrian safety evaluation report',
      notes: 'The report summarizes pedestrian injury statistics, trends and measurements.'
    }] }
  }, CKAN_SOURCE, 'reduce pedestrian injuries', 'municipal');
  assert.equal(leads.length, 0);
});
