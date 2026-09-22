'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { discoverSourceDrivenInterventions } = require('../js/source-driven-intervention-discovery');

const SOURCE = {
  sourceId: 'ca-program-discovery',
  jurisdiction: 'CA',
  domain: 'intervention-universe',
  url: 'https://open.canada.ca/data/en/api/3/action/package_search?q='
};

function response(records) {
  const bytes = Buffer.from(JSON.stringify({ result: { results: records } }));
  return { ok: true, status: 200, headers: { get: key => key === 'content-type' ? 'application/json' : null }, arrayBuffer: async () => bytes };
}

const CASES = [
  {
    problem: 'reduce household energy poverty',
    pertinent: [
      ['home energy assistance benefit', 'Utility assistance for households unable to afford essential energy costs.'],
      ['home weatherization program', 'Energy-efficiency upgrades that reduce household energy burden.']
    ],
    decoys: [
      ['traffic enforcement program', 'Traffic enforcement and road safety operations.'],
      ['crime statistics dashboard', 'Crime statistics and reporting data.']
    ]
  },
  {
    problem: 'reduce transit delay',
    pertinent: [
      ['bus priority lane program', 'Dedicated transit priority lanes improve bus reliability and reduce delay.'],
      ['traffic signal priority project', 'Signal priority for transit vehicles reduces intersection delay.']
    ],
    decoys: [
      ['homelessness statistics report', 'Administrative homelessness statistics.'],
      ['stormwater drainage project', 'Flood and drainage infrastructure.']
    ]
  },
  {
    problem: 'reduce household food insecurity',
    pertinent: [
      ['healthy food voucher program', 'Food purchasing support for households experiencing food insecurity.'],
      ['community food distribution service', 'Local food access and distribution service.']
    ],
    decoys: [
      ['traffic signal modernization', 'Intersection operations and road infrastructure.'],
      ['crime reporting dashboard', 'Crime reporting information.']
    ]
  },
  {
    problem: 'reduce wildfire smoke exposure',
    pertinent: [
      ['clean air shelter service', 'Public cooling and clean-air shelter response during wildfire smoke events.'],
      ['community air filtration program', 'Indoor filtration support to reduce smoke exposure.']
    ],
    decoys: [
      ['wildfire smoke monitoring dataset', 'Air-quality monitoring data and statistics.'],
      ['forest recreation grant', 'Outdoor recreation programming.']
    ]
  },
  {
    problem: 'reduce preventable pedestrian injuries',
    pertinent: [
      ['protected pedestrian crossing project', 'Pedestrian safety infrastructure at high-risk crossings.'],
      ['traffic calming program', 'Traffic calming and speed reduction measures.']
    ],
    decoys: [
      ['pedestrian injury dashboard', 'Collision and injury statistics dashboard.'],
      ['municipal water billing program', 'Water billing administration.']
    ]
  },
  {
    problem: 'reduce emergency department overcrowding',
    pertinent: [
      ['community primary care clinic', 'Primary care access that diverts appropriate demand from emergency departments.'],
      ['hospital patient flow service', 'Patient-flow and urgent-care capacity intervention.']
    ],
    decoys: [
      ['emergency department utilization report', 'Hospital utilization statistics and reporting.'],
      ['road resurfacing program', 'Municipal pavement maintenance.']
    ]
  }
];

for (const scenario of CASES) {
  test(`novel relevance: ${scenario.problem}`, async () => {
    const records = [...scenario.pertinent, ...scenario.decoys].map(([title, notes], i) => ({ id: `${i}`, title, notes }));
    const result = await discoverSourceDrivenInterventions({
      problem: scenario.problem,
      jurisdiction: 'CA',
      sources: [SOURCE],
      fetchImpl: async () => response(records)
    });
    const names = new Set(result.candidates.map(candidate => candidate.name.toLowerCase()));
    for (const [title] of scenario.pertinent) assert(names.has(title), `pertinent intervention was lost: ${title}`);
    for (const [title] of scenario.decoys) assert(!names.has(title), `decoy leaked into intervention universe: ${title}`);
    assert.equal(result.recommendationEligible, false);
  });
}

console.log(`novel intervention relevance suite: ${CASES.length} problem domains covered`);
