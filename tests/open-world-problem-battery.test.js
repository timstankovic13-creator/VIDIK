'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { executeFullCapacityDecision } = require('../js/decision-discovery-execution');

const PROBLEMS = [
  'reduce violent crime',
  'reduce opioid overdose deaths',
  'reduce homelessness',
  'reduce traffic fatalities',
  'reduce urban flooding',
  'improve food security',
  'reduce youth unemployment',
  'improve access to primary care',
];

function mockResponse(problem) {
  const normalized = String(problem).toLowerCase();
  const candidates = [
    { id: 'discovered-1', title: `${problem} prevention program`, notes: 'Source-discovered intervention lead.', tags: [{ name: 'program' }] },
    { id: 'discovered-2', title: `${problem} support service`, notes: 'Source-discovered service lead.', tags: [{ name: 'service' }] },
  ];
  if (normalized.includes('crime')) {
    candidates[0].title = 'Violence prevention program';
    candidates[1].title = 'Community safety support service';
  } else if (normalized.includes('overdose')) {
    candidates[0].title = 'Overdose prevention program';
    candidates[1].title = 'Addiction treatment support service';
  } else if (normalized.includes('homeless')) {
    candidates[0].title = 'Homelessness housing program';
    candidates[1].title = 'Shelter and rehousing support service';
  } else if (normalized.includes('traffic')) {
    candidates[0].title = 'Traffic safety enforcement program';
    candidates[1].title = 'Road safety infrastructure project';
  } else if (normalized.includes('flood')) {
    candidates[0].title = 'Urban flood resilience program';
    candidates[1].title = 'Stormwater infrastructure project';
  } else if (normalized.includes('food')) {
    candidates[0].title = 'Food access program';
    candidates[1].title = 'Community food support service';
  } else if (normalized.includes('unemployment')) {
    candidates[0].title = 'Youth employment training program';
    candidates[1].title = 'Workforce support service';
  } else if (normalized.includes('primary care')) {
    candidates[0].title = 'Primary care clinic program';
    candidates[1].title = 'Primary care access support service';
  }
  return {
    ok: true,
    status: 200,
    headers: { get: key => key === 'content-type' ? 'application/json' : null },
    arrayBuffer: async () => Buffer.from(JSON.stringify({ result: { results: candidates } })),
  };
}

test('full-capacity discovery accepts a broad unseen-problem battery without a curated problem allowlist', async () => {
  for (const problem of PROBLEMS) {
    const run = await executeFullCapacityDecision({
      problem,
      requiredSourceTypes: ['intervention-library'],
      statusQuo: { explicit: true, id: `status-${problem.replace(/\W+/g, '-')}` },
      fetchImpl: async () => mockResponse(problem),
    });
    assert.equal(run.candidates.length, 2, `${problem}: candidates were not discovered`);
    assert.equal(run.governance.learningDiscoveryLeadOnly, true, `${problem}: discovery learning boundary missing`);
    assert.equal(run.governance.learningEffectsImported, false, `${problem}: effects leaked into discovery`);
    assert.equal(run.governance.recommendationAllowed, false, `${problem}: discovery-only evidence should not recommend`);
  }
});
