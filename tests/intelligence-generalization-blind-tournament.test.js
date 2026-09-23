'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { discoverSourceDrivenInterventions } = require('../js/source-driven-intervention-discovery');

const CA = { sourceId: 'ca-program-discovery', jurisdiction: 'CA', domain: 'intervention-universe', url: 'https://open.canada.ca/data/en/api/3/action/package_search?q=' };

const PROBLEMS = [
  { problem: 'reduce extreme heat illness', expectedFamilies: ['climate-resilience'] },
  { problem: 'improve food access', expectedFamilies: ['food-access'] },
  { problem: 'reduce pedestrian injuries', expectedFamilies: ['mobility-safety'] },
  { problem: 'reduce wildfire smoke exposure', expectedFamilies: ['climate-resilience'] },
  { problem: 'support workers displaced by automation', expectedFamilies: ['employment'] }
];

const RECORDS = {
  'reduce extreme heat illness': [
    { id: 'cooling', title: 'Community cooling centre emergency response service', notes: 'Seasonal heat-response service.' },
    { id: 'shade', title: 'Neighbourhood shade infrastructure project', notes: 'Public cooling infrastructure.' },
    { id: 'heat-data', title: 'Extreme Heat Statistics Dataset', notes: 'Observed heat illness counts.' }
  ],
  'improve food access': [
    { id: 'food-voucher', title: 'Healthy food voucher program', notes: 'Subsidized food purchasing support.' },
    { id: 'food-bank', title: 'Community food bank service', notes: 'Emergency food access.' },
    { id: 'food-profile', title: 'Food insecurity profile', notes: 'Administrative statistics.' }
  ],
  'reduce pedestrian injuries': [
    { id: 'bike-lane', title: 'Protected bike lane infrastructure project', notes: 'Street safety infrastructure.' },
    { id: 'traffic', title: 'Pedestrian traffic calming program', notes: 'Road safety intervention.' },
    { id: 'ped-data', title: 'Pedestrian injury dashboard', notes: 'Observed collision records.' }
  ],
  'reduce wildfire smoke exposure': [
    { id: 'clean-air', title: 'Clean air shelter service', notes: 'Smoke response and public health support.' },
    { id: 'filtration', title: 'Community air filtration program', notes: 'Indoor smoke exposure reduction.' },
    { id: 'smoke-report', title: 'Wildfire smoke monitoring report', notes: 'Environmental information.' }
  ],
  'support workers displaced by automation': [
    { id: 'training', title: 'Worker reskilling training program', notes: 'Employment transition support.' },
    { id: 'placement', title: 'Displaced worker employment service', notes: 'Job placement and support.' },
    { id: 'worker-data', title: 'Worker displacement statistics', notes: 'Labour-market data.' }
  ]
};

function response(value) {
  const bytes = Buffer.from(JSON.stringify(value));
  return { ok: true, status: 200, headers: { get: key => key === 'content-type' ? 'application/json' : null }, arrayBuffer: async () => bytes };
}

for (const { problem, expectedFamilies } of PROBLEMS) {
  test(`blind tournament: ${problem}`, async () => {
    const discovery = await discoverSourceDrivenInterventions({
      problem,
      jurisdiction: 'CA',
      sources: [CA],
      fetchImpl: async () => response({ result: { results: RECORDS[problem] } })
    });

    assert.ok(discovery.candidates.length >= 2, 'VIDIK must discover multiple intervention candidates without supplied candidate names');
    assert.ok(discovery.interventionUniverse.discoveryComplete);
    assert.ok(discovery.interventionUniverse.interventionFamilies.some(family => expectedFamilies.includes(family)));
    assert.ok(discovery.candidates.every(candidate => candidate.discovery.discoveryOnly));
    assert.ok(discovery.candidates.every(candidate => candidate.discovery.leadOnly));
    assert.ok(discovery.candidates.every(candidate => candidate.discovery.effectsImported === false));
    assert.equal(discovery.recommendationEligible, false);
    assert.equal(discovery.interventionUniverse.recommendationEligible, false);

    const names = discovery.candidates.map(candidate => candidate.canonicalName);
    assert.equal(new Set(names).size, names.length, 'candidate normalization must deduplicate the discovered universe');
  });
}

test('blind tournament rejects a pure data result instead of treating it as an intervention', async () => {
  const discovery = await discoverSourceDrivenInterventions({
    problem: 'improve community library access',
    jurisdiction: 'CA',
    sources: [CA],
    fetchImpl: async () => response({ result: { results: [
      { id: 'data-only', title: 'Community Library Access Statistics Dataset', notes: 'Data only.' },
      { id: 'real', title: 'Community library service program', notes: 'Direct service intervention.' }
    ] } })
  });
  assert.equal(discovery.candidates.length, 1);
  assert.equal(discovery.candidates[0].name, 'Community library service program');
});
