'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { discoverSourceDrivenInterventions } = require('../js/source-driven-intervention-discovery');
const { SOURCE_REGISTRY } = require('../js/source-registry');

const CASES = [
  { jurisdiction: 'CA', sourceId: 'ca-program-discovery', problem: 'reduce rental affordability pressure' },
  { jurisdiction: 'US', sourceId: 'us-open-data-program-discovery', problem: 'reduce pedestrian injuries' },
  { jurisdiction: 'UK', sourceId: 'uk-open-data-program-discovery', problem: 'reduce urban heat exposure' },
  { jurisdiction: 'AU', sourceId: 'au-open-data-program-discovery', problem: 'reduce opioid mortality' }
];

function responseFor(jurisdiction) {
  const records = {
    CA: [
      { id: 'a', title: 'Rent assistance program', notes: 'Direct rental support service for households facing affordability pressure.' },
      { id: 'b', title: 'Affordable housing development initiative', notes: 'Housing initiative that expands below-market supply.' },
      { id: 'decoy', title: 'Rental affordability statistics dashboard', notes: 'Municipal statistics and open data dashboard.' }
    ],
    US: [
      { id: 'a', title: 'Protected intersection safety project', notes: 'Infrastructure project to reduce pedestrian injury risk.' },
      { id: 'b', title: 'Pedestrian safety enforcement program', notes: 'Targeted enforcement service at high-risk crossings.' },
      { id: 'decoy', title: 'Pedestrian injury data dashboard', notes: 'Statistics and monitoring data.' }
    ],
    UK: [
      { id: 'a', title: 'Urban cooling centre service', notes: 'Public cooling service during extreme heat.' },
      { id: 'b', title: 'Cool-roof retrofit grant program', notes: 'Grant funding for heat-reducing building retrofits.' },
      { id: 'decoy', title: 'Heat exposure statistics report', notes: 'Population statistics and monitoring data.' }
    ],
    AU: [
      { id: 'a', title: 'Low-barrier opioid treatment service', notes: 'Treatment and outreach service for people at risk of opioid mortality.' },
      { id: 'b', title: 'Naloxone distribution program', notes: 'Public-health prevention program providing overdose reversal medication.' },
      { id: 'decoy', title: 'Opioid mortality statistics dataset', notes: 'Mortality statistics and dashboard data.' }
    ]
  };
  return { result: { results: records[jurisdiction] } };
}

function fetchImplFactory() {
  return async () => {
    const body = JSON.stringify(responseFor('CA'));
    return {
      ok: true,
      status: 200,
      headers: { get: name => name.toLowerCase() === 'content-type' ? 'application/json' : null },
      arrayBuffer: async () => Buffer.from(body)
    };
  };
}

test('blind discovery works across unseen jurisdiction/problem combinations without a hand-authored candidate list', async () => {
  for (const scenario of CASES) {
    const source = SOURCE_REGISTRY.find(item => item.sourceId === scenario.sourceId);
    assert.ok(source, `${scenario.jurisdiction}: source registry entry missing`);

    const run = await discoverSourceDrivenInterventions({
      problem: scenario.problem,
      jurisdiction: scenario.jurisdiction,
      sources: [source],
      fetchImpl: async (url, options) => {
        assert.equal(options.redirect, 'manual');
        const body = JSON.stringify(responseFor(scenario.jurisdiction));
        return {
          ok: true,
          status: 200,
          headers: { get: name => name.toLowerCase() === 'content-type' ? 'application/json' : null },
          arrayBuffer: async () => Buffer.from(body)
        };
      }
    });

    assert.deepEqual(run.sourcesSelected, [scenario.sourceId]);
    assert.equal(run.sourceApplicability.rejectedSuppliedSources.length, 0);
    assert.ok(run.candidates.length >= 2, `${scenario.jurisdiction}: discovery returned too few actionable leads`);
    assert.ok(run.candidates.every(candidate => candidate.discovery.leadOnly === true));
    assert.ok(run.candidates.every(candidate => candidate.discovery.effectsImported === false));
    assert.ok(run.candidates.every(candidate => candidate.discovery.provenance.every(item => item.jurisdiction === scenario.jurisdiction)));
    assert.ok(run.candidates.every(candidate => candidate.interventionFamily.some(family => family !== 'other')));
    assert.equal(run.candidates.some(candidate => /dashboard|statistics|dataset|report/i.test(candidate.name)), false, `${scenario.jurisdiction}: administrative data record leaked into intervention universe`);
    assert.equal(run.recommendationEligible, false);
    assert.equal(run.interventionUniverse.recommendationEligible, false);
  }
});

test('jurisdiction firewall rejects a supplied source from another country before retrieval', async () => {
  const canadian = SOURCE_REGISTRY.find(item => item.sourceId === 'ca-program-discovery');
  const run = await discoverSourceDrivenInterventions({
    problem: 'reduce pedestrian injuries',
    jurisdiction: 'US',
    sources: [canadian],
    fetchImpl: async () => { throw new Error('wrong-jurisdiction source should never be fetched'); }
  });

  assert.deepEqual(run.sourcesSelected, []);
  assert.equal(run.sourceApplicability.rejectedSuppliedSources.length, 1);
  assert.equal(run.sourceApplicability.rejectedSuppliedSources[0].reason, 'jurisdiction-mismatch');
  assert.equal(run.interventionUniverse.discoveryComplete, false);
  assert.equal(run.recommendationEligible, false);
});
