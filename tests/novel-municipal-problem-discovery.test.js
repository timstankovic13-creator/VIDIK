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
  url: 'https://open.canada.ca/data/en/api/3/action/package_search?q='
};

// These are deliberately outside the existing blind tournament and relevance battery.
// The test asks for broad, relevant discovery, not an exact list or exact count.
const cases = [
  { id: 'opioid-overdose', problem: 'reduce preventable opioid overdose deaths', expected: ['public-safety', 'health-service'] },
  { id: 'rental-affordability', problem: 'improve rental affordability for low-income households', expected: ['housing', 'economic-support'] },
  { id: 'transit-reliability', problem: 'improve unreliable public transit service', expected: ['mobility-safety', 'infrastructure'] },
  { id: 'social-isolation', problem: 'reduce harmful social isolation among older adults', expected: ['health-service', 'direct-service'] },
  { id: 'sewer-backups', problem: 'reduce residential sewer backups during heavy rainfall', expected: ['infrastructure', 'climate-resilience'] },
  { id: 'digital-divide', problem: 'improve reliable internet access for underserved residents', expected: ['infrastructure', 'economic-support'] },
  { id: 'illegal-dumping', problem: 'reduce illegal dumping in vulnerable neighbourhoods', expected: ['public-safety', 'regulatory'] },
  { id: 'water-conservation', problem: 'reduce municipal drinking-water demand during drought', expected: ['infrastructure', 'regulatory'] },
  { id: 'vacant-storefronts', problem: 'reduce long-term vacant storefronts in commercial districts', expected: ['economic-support', 'regulatory'] },
  { id: 'emergency-shelter', problem: 'increase safe emergency shelter capacity during winter', expected: ['housing', 'direct-service'] },
  { id: 'noise-pollution', problem: 'reduce harmful chronic noise exposure near major roads', expected: ['regulatory', 'infrastructure'] },
  { id: 'heat-energy', problem: 'reduce household energy insecurity during extreme cold', expected: ['economic-support', 'infrastructure'] }
];

function responseFor(problem) {
  const p = problem.toLowerCase();
  const records = [];
  const add = (id, title, notes, tags = []) => records.push({ id, title, notes, tags: tags.map(name => ({ name })) });

  if (p.includes('opioid')) add('opioid-service', 'Community opioid treatment and outreach program', 'Treatment, outreach and naloxone support for residents at risk of overdose.', ['opioid', 'health', 'treatment']);
  else if (p.includes('rental')) add('rent-support', 'Rental assistance and housing support program', 'Subsidy and housing support for low-income renters.', ['housing', 'rent', 'subsidy']);
  else if (p.includes('transit')) add('transit-service', 'Transit service reliability program', 'Service improvements, bus priority and transit operations support.', ['transit', 'service']);
  else if (p.includes('isolation')) add('senior-outreach', 'Older adult community outreach service', 'Community outreach and social connection service for isolated older adults.', ['health', 'outreach', 'service']);
  else if (p.includes('sewer')) add('sewer-retrofit', 'Stormwater and sewer retrofit program', 'Infrastructure upgrades to reduce sewer backups during heavy rainfall.', ['infrastructure', 'stormwater', 'project']);
  else if (p.includes('internet')) add('connectivity-grant', 'Community broadband access grant', 'Funding and infrastructure support for underserved households.', ['internet', 'grant', 'infrastructure']);
  else if (p.includes('dumping')) add('dumping-enforcement', 'Illegal dumping inspection and enforcement program', 'Inspections, enforcement and reporting support for illegal dumping.', ['enforcement', 'inspection']);
  else if (p.includes('water')) add('water-efficiency', 'Municipal water efficiency incentive program', 'Incentives and infrastructure support to reduce drinking-water demand.', ['water', 'incentive', 'infrastructure']);
  else if (p.includes('storefront')) add('business-vacancy', 'Commercial vacancy revitalization grant program', 'Funding and business support for long-term vacant storefronts.', ['business', 'grant', 'funding']);
  else if (p.includes('shelter')) add('winter-shelter', 'Emergency winter shelter capacity program', 'Emergency shelter service and temporary capacity expansion.', ['shelter', 'service', 'capacity']);
  else if (p.includes('noise')) add('noise-regulation', 'Roadside noise mitigation and enforcement program', 'Noise inspections, mitigation and regulatory enforcement near major roads.', ['noise', 'inspection', 'enforcement']);
  else if (p.includes('energy')) add('energy-benefit', 'Household energy assistance benefit program', 'Energy bill support and home efficiency assistance for households in need.', ['energy', 'benefit', 'housing']);

  // Deliberate decoy: useful information but not an intervention. VIDIK must reject it.
  add(`data-${records.length}`, 'Municipal statistics and dashboard', 'Administrative records and monitoring data for the topic.', ['dataset', 'statistics', 'dashboard']);
  return { result: { results: records } };
}

function mockResponse(value) {
  const bytes = Buffer.from(JSON.stringify(value));
  return { ok: true, status: 200, headers: { get: key => key === 'content-type' ? 'application/json' : null }, arrayBuffer: async () => bytes };
}

test('novel municipal problem tournament discovers relevant intervention families without exact-list overfitting', async () => {
  const outcomes = [];
  for (const scenario of cases) {
    const result = await discoverSourceDrivenInterventions({
      problem: scenario.problem,
      jurisdiction: 'CA',
      sources: [SOURCE],
      fetchImpl: async () => mockResponse(responseFor(scenario.problem))
    });

    const candidates = result.candidates;
    assert.ok(candidates.length >= 1, `${scenario.id}: expected at least one actionable lead`);
    assert.equal(result.recommendationEligible, false, `${scenario.id}: discovery must remain lead-only`);
    assert.ok(result.interventionUniverse.discoveryComplete, `${scenario.id}: discovery should complete when the source succeeds`);
    assert.equal(candidates.some(c => /statistics|dashboard|dataset/i.test(c.name)), false, `${scenario.id}: data resource leaked into intervention universe`);

    const families = new Set(candidates.flatMap(candidate => candidate.interventionFamily || []));
    assert.ok(scenario.expected.some(family => families.has(family)), `${scenario.id}: no expected intervention family discovered; got ${[...families].join(', ')}`);
    outcomes.push({ id: scenario.id, candidates: candidates.length, families: [...families] });
  }

  assert.equal(outcomes.length, cases.length);
  assert.ok(outcomes.filter(item => item.candidates > 1).length >= 2, 'discovery should sometimes expose more than one plausible lead when the source provides them');
  console.log(`novel municipal discovery: ${outcomes.length}/${cases.length} scenarios passed`);
  for (const item of outcomes) console.log(`${item.id}: ${item.candidates} candidate(s), families=${item.families.join(',')}`);
});
