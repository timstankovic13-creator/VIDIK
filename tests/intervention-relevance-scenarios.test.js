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

function response(value) {
  const bytes = Buffer.from(JSON.stringify(value));
  return { ok: true, status: 200, headers: { get: key => key === 'content-type' ? 'application/json' : null }, arrayBuffer: async () => bytes };
}

const SCENARIOS = [
  {
    name: 'violent crime', problem: 'reduce violent crime',
    records: [
      ['focused deterrence violence prevention program', 'Violence prevention and outreach program.'],
      ['community violence intervention service', 'Community outreach and violence interruption service.'],
      ['neighbourhood tree planting program', 'Urban greening program.'],
      ['crime statistics dashboard', 'Crime statistics and reporting.']
    ],
    expected: ['focused deterrence violence prevention program', 'community violence intervention service'],
    rejected: ['crime statistics dashboard']
  },
  {
    name: 'housing', problem: 'reduce chronic homelessness',
    records: [
      ['housing first supportive housing program', 'Permanent supportive housing service.'],
      ['rapid rehousing service', 'Rapid rehousing and housing stabilization.'],
      ['homelessness statistics report', 'Administrative homelessness statistics.'],
      ['park beautification project', 'Public realm improvement project.']
    ],
    expected: ['housing first supportive housing program', 'rapid rehousing service'],
    rejected: ['homelessness statistics report']
  },
  {
    name: 'food access', problem: 'improve food access',
    records: [
      ['healthy food voucher program', 'Subsidized food purchasing support.'],
      ['community food access service', 'Local food access and distribution service.'],
      ['food insecurity profile', 'Food insecurity statistics profile.'],
      ['municipal website redesign project', 'Digital service project.']
    ],
    expected: ['healthy food voucher program', 'community food access service'],
    rejected: ['food insecurity profile']
  },
  {
    name: 'pedestrian safety', problem: 'reduce pedestrian injuries',
    records: [
      ['protected pedestrian crossing infrastructure project', 'Pedestrian safety infrastructure.'],
      ['traffic calming program', 'Traffic calming and road safety program.'],
      ['pedestrian injury dashboard', 'Collision and injury data dashboard.'],
      ['general road resurfacing project', 'Road resurfacing project.']
    ],
    expected: ['protected pedestrian crossing infrastructure project', 'traffic calming program'],
    rejected: ['pedestrian injury dashboard']
  },
  {
    name: 'extreme heat', problem: 'reduce extreme heat illness',
    records: [
      ['community cooling centre service', 'Heat-response cooling service.'],
      ['urban shade infrastructure project', 'Shade infrastructure for heat resilience.'],
      ['extreme heat statistics dataset', 'Observed heat illness data.'],
      ['winter road maintenance program', 'Seasonal road maintenance.']
    ],
    expected: ['community cooling centre service', 'urban shade infrastructure project'],
    rejected: ['extreme heat statistics dataset']
  },
  {
    name: 'wildfire smoke', problem: 'reduce wildfire smoke exposure',
    records: [
      ['clean air shelter service', 'Smoke-response public health shelter.'],
      ['community air filtration program', 'Indoor filtration to reduce smoke exposure.'],
      ['wildfire smoke monitoring report', 'Environmental monitoring report.'],
      ['forest recreation program', 'Outdoor recreation service.']
    ],
    expected: ['clean air shelter service', 'community air filtration program'],
    rejected: ['wildfire smoke monitoring report']
  },
  {
    name: 'worker displacement', problem: 'support workers displaced by automation',
    records: [
      ['worker reskilling training program', 'Employment transition training.'],
      ['displaced worker employment service', 'Job placement and transition support.'],
      ['worker displacement statistics', 'Labour-market statistics.'],
      ['business tax filing service', 'Administrative business service.']
    ],
    expected: ['worker reskilling training program', 'displaced worker employment service'],
    rejected: ['worker displacement statistics']
  },
  {
    name: 'public health', problem: 'reduce avoidable emergency department use',
    records: [
      ['community primary care clinic', 'Primary care access service.'],
      ['mobile health outreach service', 'Community health outreach.'],
      ['emergency department utilization report', 'Hospital utilization statistics.'],
      ['city park maintenance program', 'Municipal maintenance program.']
    ],
    expected: ['community primary care clinic', 'mobile health outreach service'],
    rejected: ['emergency department utilization report']
  },
  {
    name: 'flooding', problem: 'reduce urban flooding',
    records: [
      ['stormwater retention infrastructure project', 'Flood mitigation infrastructure.'],
      ['urban drainage improvement program', 'Drainage and flood resilience program.'],
      ['urban flooding risk dashboard', 'Flood risk data dashboard.'],
      ['community arts grant program', 'Arts grant program.']
    ],
    expected: ['stormwater retention infrastructure project', 'urban drainage improvement program'],
    rejected: ['urban flooding risk dashboard']
  },
  {
    name: 'deliberate decoy pressure', problem: 'reduce violent crime',
    records: [
      ['violent crime statistics dataset', 'Violence statistics.'],
      ['crime reporting dashboard', 'Crime reporting information.'],
      ['community violence prevention service', 'Direct violence prevention service.'],
      ['violence intervention program', 'Direct intervention program.']
    ],
    expected: ['community violence prevention service', 'violence intervention program'],
    rejected: ['violent crime statistics dataset', 'crime reporting dashboard']
  }
];

for (const scenario of SCENARIOS) {
  test(`relevance scenario: ${scenario.name}`, async () => {
    const records = scenario.records.map(([title, notes], index) => ({ id: `${scenario.name}-${index}`, title, notes }));
    const result = await discoverSourceDrivenInterventions({
      problem: scenario.problem,
      jurisdiction: 'CA',
      sources: [SOURCE],
      fetchImpl: async () => response({ result: { results: records } })
    });

    const names = result.candidates.map(candidate => candidate.name.toLowerCase());
    for (const expected of scenario.expected) assert.ok(names.includes(expected), `missing pertinent intervention: ${expected}`);
    for (const rejected of scenario.rejected) assert.ok(!names.includes(rejected), `irrelevant resource leaked into intervention universe: ${rejected}`);
    assert.equal(result.recommendationEligible, false);
    assert.ok(result.candidates.every(candidate => candidate.discovery.discoveryOnly));
    assert.ok(result.candidates.every(candidate => candidate.discovery.effectsImported === false));
  });
}

test('relevance scenarios preserve distinct intervention families rather than collapsing everything to one generic option', async () => {
  const result = await discoverSourceDrivenInterventions({
    problem: 'reduce violent crime', jurisdiction: 'CA', sources: [SOURCE],
    fetchImpl: async () => response({ result: { results: [
      { id: 'safety', title: 'Community violence prevention service', notes: 'Violence prevention outreach.' },
      { id: 'housing', title: 'Supportive housing program', notes: 'Housing stabilization service for high-risk residents.' },
      { id: 'data', title: 'Violent crime statistics dataset', notes: 'Statistics.' }
    ] } })
  });
  const families = new Set(result.candidates.flatMap(candidate => candidate.interventionFamily));
  assert.ok(families.has('public-safety'));
  assert.ok(families.has('housing'));
  assert.equal(result.candidates.length, 2);
});
