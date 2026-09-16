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

function mockResponse() {
  return {
    ok: true,
    status: 200,
    headers: { get: key => key === 'content-type' ? 'application/json' : null },
    arrayBuffer: async () => Buffer.from(JSON.stringify({ result: { results: [
      { id: 'discovered-1', title: 'Community intervention program', notes: 'Potentially relevant program.', tags: [{ name: 'community' }] },
      { id: 'discovered-2', title: 'Prevention and support program', notes: 'Potentially relevant prevention intervention.', tags: [{ name: 'prevention' }] },
    ] } })),
  };
}

test('full-capacity discovery accepts a broad unseen-problem battery without a curated problem allowlist', async () => {
  for (const problem of PROBLEMS) {
    const run = await executeFullCapacityDecision({
      problem,
      requiredSourceTypes: ['intervention-library'],
      statusQuo: { explicit: true, id: `status-${problem.replace(/\W+/g, '-')}` },
      fetchImpl: async () => mockResponse(),
    });
    assert.equal(run.candidates.length, 2, `${problem}: candidates were not discovered`);
    assert.equal(run.governance.learningDiscoveryLeadOnly, true, `${problem}: discovery learning boundary missing`);
    assert.equal(run.governance.learningEffectsImported, false, `${problem}: effects leaked into discovery`);
    assert.equal(run.governance.recommendationAllowed, false, `${problem}: discovery-only evidence should not recommend`);
  }
});
