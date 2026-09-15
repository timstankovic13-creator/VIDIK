'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { classifyCkanRecord, extractCkanInterventionLeads, discoverSourceDrivenInterventions, buildApplicabilityAudit } = require('../js/source-driven-intervention-discovery');
const CA = { sourceId: 'ca-program-discovery', provider: 'Government of Canada Open Government Portal', jurisdiction: 'CA', domain: 'intervention-universe', tier: 'official_machine_readable', accessMethod: 'ckan-action-api', url: 'https://open.canada.ca/data/en/api/3/action/package_search?q=' };
const CA2 = { sourceId: 'ca-ontario-program-discovery', provider: 'Ontario Open Data', jurisdiction: 'CA', domain: 'intervention-universe', tier: 'official_machine_readable', accessMethod: 'ckan-action-api', url: 'https://ontario.ca/api/3/action/package_search?q=' };
const US = { sourceId: 'us-open-data-program-discovery', provider: 'US Open Data', jurisdiction: 'US', domain: 'intervention-universe', tier: 'official_machine_readable', accessMethod: 'ckan-action-api', url: 'https://data.gov/api/3/action/package_search?q=' };
function mockResponse(value) { const bytes = Buffer.from(JSON.stringify(value)); return { ok: true, status: 200, headers: { get: key => key === 'content-type' ? 'application/json' : null }, arrayBuffer: async () => bytes }; }
const nonInterventions = [
  { title: 'Older Adult Population Census Data', notes: 'Population counts by age.' }, { title: 'Emergency Department Visits', notes: 'Administrative statistics on emergency visits.' },
  { title: 'Municipal Budget Open Data', notes: 'Annual expenditure and revenue records.' }, { title: 'Climate Information — General Information', notes: 'General climate information and indicators.' },
  { title: 'Housing Statistics Report', notes: 'Annual report on housing outcomes.' }, { title: 'Violent Crime Dashboard', notes: 'Interactive indicator dashboard.' }
];
test('outsider audit: relevant government records are not automatically interventions', () => { for (const row of nonInterventions) { const classification = classifyCkanRecord(row); assert.equal(classification.accepted, false, row.title); assert.match(classification.reason, /non-intervention|insufficient/); } });
test('legitimate intervention forms remain discoverable without effects', () => {
  const rows = [
    { id: 'p1', title: 'Community food access program', notes: 'Municipal service providing food support.' }, { id: 'p2', title: 'Housing First supportive housing initiative', notes: 'Permanent housing and support services.' },
    { id: 'p3', title: 'Protected bike lane project', notes: 'Street infrastructure intervention.' }, { id: 'p4', title: 'Cooling centre emergency response service', notes: 'Heat-response service for residents.' },
    { id: 'p5', title: 'Violence prevention outreach program', notes: 'Community prevention and outreach.' }
  ];
  const leads = extractCkanInterventionLeads({ result: { results: rows } }, CA, 'public safety'); assert.equal(leads.length, rows.length);
  for (const lead of leads) { assert.equal(lead.discovery.leadOnly, true); assert.equal(lead.discovery.effectsImported, false); assert.equal(lead.discovery.discoveryOnly, true); assert.equal(lead.discovery.classification.basis, 'intervention-signal'); }
});
test('ambiguous catalogue records fail closed rather than becoming intervention candidates', () => {
  const rows = [{ id: 'a1', title: 'Community outcomes', notes: 'Information related to food insecurity.' }, { id: 'a2', title: 'Housing resources', notes: 'Links and information for residents.' }, { id: 'a3', title: 'Crime prevention', notes: 'General information and statistics.' }];
  assert.equal(extractCkanInterventionLeads({ result: { results: rows } }, CA, 'crime').length, 0);
});
test('requested jurisdiction cannot be bypassed by injecting another jurisdiction source', async () => {
  const result = await discoverSourceDrivenInterventions({ problem: 'food insecurity', jurisdiction: 'CA', sources: [US], fetchImpl: async () => { throw new Error('should-not-fetch-rejected-source'); } });
  assert.deepEqual(result.sourcesSelected, []); assert.deepEqual(result.sourceSearches, []); assert.equal(result.candidates.length, 0); assert.equal(result.recommendationEligible, false); assert.deepEqual(result.sourceApplicability.rejectedSuppliedSources, [{ sourceId: US.sourceId, jurisdiction: 'US', canonicalJurisdiction: 'US', reason: 'jurisdiction-mismatch' }]);
});
test('source metadata cannot be spoofed to manufacture an international exception', () => { const spoofed = { ...CA, jurisdiction: 'international' }; const audit = buildApplicabilityAudit({ problem: 'housing', jurisdiction: 'CA', suppliedSources: [spoofed] }); assert.deepEqual(audit.rejectedSuppliedSources, [{ sourceId: CA.sourceId, jurisdiction: 'international', canonicalJurisdiction: 'CA', reason: 'jurisdiction-mismatch' }]); });
test('partial source outage preserves usable leads but remains recommendation-blocked', async () => {
  const result = await discoverSourceDrivenInterventions({ problem: 'food insecurity', jurisdiction: 'CA', sources: [CA, CA2], fetchImpl: async url => url.includes('open.canada.ca') ? mockResponse({ result: { results: [{ id: 'p1', title: 'Community food access program', notes: 'Food support service.' }] } }) : Promise.reject(new Error('upstream-timeout')) });
  assert.equal(result.candidates.length, 1); assert.equal(result.sourceSearches.filter(s => s.status === 'search-failed').length, 1); assert.equal(result.recommendationEligible, false);
});
test('malformed and missing metadata cannot create candidates', () => { const rows = [null, {}, { id: 'x', notes: 'program service' }, { id: 'y', title: '   ' }, { id: 'z', title: 'Housing dataset', notes: 'supportive housing program data' }]; assert.equal(extractCkanInterventionLeads({ result: { results: rows } }, CA, 'housing').length, 0); });
test('catalogue records cannot smuggle causal effects into a discovery lead', () => {
  const leads = extractCkanInterventionLeads({ result: { results: [{ id: 'p', title: 'Housing First program', notes: 'program', effect: -0.9, causalEffect: -0.9, estimatedImpact: 999999, recommendationEligible: true }] } }, CA, 'homelessness');
  assert.equal(leads.length, 1); const lead = leads[0]; assert.equal(lead.discovery.effectsImported, false); assert.equal(lead.discovery.leadOnly, true); assert.equal(Object.hasOwn(lead, 'effect'), false); assert.equal(Object.hasOwn(lead, 'causalEffect'), false); assert.equal(Object.hasOwn(lead, 'estimatedImpact'), false); assert.equal(Object.hasOwn(lead, 'recommendationEligible'), false);
});
test('discovery hash is stable for identical source evidence at the same retrieval time', async () => {
  const options = { problem: 'food insecurity', jurisdiction: 'CA', sources: [CA], now: new Date('2026-01-01T00:00:00.000Z'), fetchImpl: async () => mockResponse({ result: { results: [{ id: 'p1', title: 'Community food access program', notes: 'Food support service.' }] } }) };
  const first = await discoverSourceDrivenInterventions(options); const second = await discoverSourceDrivenInterventions(options); assert.equal(first.discoveryHash, second.discoveryHash);
});
