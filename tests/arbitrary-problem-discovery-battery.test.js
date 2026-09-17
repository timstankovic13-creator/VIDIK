'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { executeFullCapacityDecision } = require('../js/decision-discovery-execution');

// These are deliberately not seeded candidate IDs. The battery exercises the
// source-driven path from an arbitrary municipal problem to a discovered,
// provenance-bearing intervention universe. Discovery leads and research hits
// must never be promoted to effects or recommendations by discovery alone.
const PROBLEMS = [
  'violent crime',
  'opioid deaths',
  'homelessness',
  'housing affordability',
  'emergency department pressure',
  'traffic fatalities',
  'food insecurity',
  'youth violence',
  'air pollution exposure',
  'climate adaptation',
  'transit reliability',
  'youth unemployment'
];

function mockResponse(value) {
  const bytes = Buffer.from(JSON.stringify(value));
  return {
    ok: true,
    status: 200,
    headers: { get: key => key === 'content-type' ? 'application/json' : null },
    arrayBuffer: async () => bytes
  };
}

function interventionRecords(problem) {
  const family = problem.toLowerCase();
  return [
    {
      id: `${family}-program-a`,
      title: `${problem} prevention program`,
      notes: `Municipal service or intervention addressing ${problem}.`,
      tags: [{ name: family }, { name: 'program' }]
    },
    {
      id: `${family}-service-b`,
      title: `${problem} support service`,
      notes: `Community implementation option for ${problem}.`,
      tags: [{ name: family }, { name: 'service' }]
    },
    {
      id: `${family}-project-c`,
      title: `${problem} infrastructure project`,
      notes: `Potential municipal project relevant to ${problem}.`,
      tags: [{ name: family }, { name: 'infrastructure' }]
    }
  ];
}

async function arbitraryProblemFetch(url) {
  const parsed = new URL(url);
  if (parsed.hostname.includes('open.canada.ca') || parsed.hostname.includes('data.ontario.ca')) {
    const problem = parsed.searchParams.get('q') || 'unknown municipal problem';
    return mockResponse({ result: { results: interventionRecords(problem) } });
  }
  if (parsed.hostname === 'api.openalex.org') {
    const query = parsed.searchParams.get('search') || 'municipal intervention';
    return mockResponse({ results: [
      { id: `https://openalex.org/${encodeURIComponent(query.slice(0, 40))}`, display_name: `Research evidence lead for ${query}` }
    ] });
  }
  if (parsed.hostname.includes('eutils.ncbi.nlm.nih.gov')) {
    return mockResponse({ esearchresult: { idlist: ['900001'] } });
  }
  throw new Error(`unexpected-discovery-url:${url}`);
}

test('arbitrary-problem battery discovers source-backed intervention universes without seeded candidates', async () => {
  for (const problem of PROBLEMS) {
    const run = await executeFullCapacityDecision({
      problem,
      discoveryJurisdiction: 'CA',
      requiredSourceTypes: ['intervention-library'],
      statusQuo: { explicit: true, id: `status-quo-${problem.replace(/[^a-z0-9]+/gi, '-')}` },
      fetchImpl: arbitraryProblemFetch
    });

    assert.equal(run.discoveryAudit.discoverySearchComplete, true, `${problem}: intervention source search must complete`);
    assert.ok(run.candidates.length >= 2, `${problem}: must discover multiple candidates`);
    assert.ok(run.governance.candidateUniverseIntelligence.candidatesConsidered >= 2, `${problem}: universe intelligence must see discovered candidates`);
    assert.equal(run.governance.recommendationAllowed, false, `${problem}: discovery-only evidence cannot silently recommend`);
    assert.equal(run.decision.status, 'recommendation-blocked', `${problem}: decision must be explicitly blocked`);
    assert.equal(run.candidates.every(candidate => candidate.discovery?.discoveryOnly === true), true, `${problem}: candidates remain discovery-only`);
    assert.equal(run.candidates.every(candidate => candidate.discovery?.effectsImported === false), true, `${problem}: no effects may be imported from discovery`);
    assert.equal(run.candidates.every(candidate => candidate.requiredEvidence?.length >= 4), true, `${problem}: evidence requirements must be attached`);
    assert.ok(run.candidates.some(candidate => String(candidate.discoveryText || '').toLowerCase().includes(problem)), `${problem}: discovered universe must remain problem-relevant`);
    assert.ok(run.candidates.every(candidate => candidate.sourceIds?.length >= 1), `${problem}: every candidate needs source provenance`);
    assert.ok(run.candidates.every(candidate => candidate.canonicalName), `${problem}: every candidate needs a canonical identity`);
    assert.equal(run.governance.learningEffectsImported, false);
    assert.equal(run.governance.learningDiscoveryLeadOnly, true);
    assert.equal(run.governance.transferEffectsImported, false);
    assert.equal(run.governance.counterfactualRequired, true);
  }
});

test('arbitrary-problem battery fails closed when a real acquisition source fails', async () => {
  const failingFetch = async url => {
    const parsed = new URL(url);
    if (parsed.hostname.includes('open.canada.ca')) throw new Error('upstream unavailable');
    return arbitraryProblemFetch(url);
  };

  const run = await executeFullCapacityDecision({
    problem: 'violent crime',
    discoveryJurisdiction: 'CA',
    requiredSourceTypes: ['intervention-library'],
    statusQuo: { explicit: true, id: 'status-quo-violent-crime' },
    fetchImpl: failingFetch
  });

  assert.equal(run.governance.recommendationAllowed, false);
  assert.equal(run.decision.recommendation, null);
  assert.equal(run.discoveryAudit.discoverySearchComplete, false);
  assert.ok(run.governance.sourceSearchFailures.length >= 1);
  assert.equal(run.governance.candidateUniverseIntelligence.recommendationEligible, false);
});

console.log('arbitrary-problem discovery battery passed');
