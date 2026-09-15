'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { runFullCapacityEngine, normalizeJurisdiction } = require('../js/engine-capacity');

function response(value, contentType = 'application/json') {
  const bytes = Buffer.from(JSON.stringify(value));
  return {
    ok: true,
    status: 200,
    headers: { get(name) { return name.toLowerCase() === 'content-type' ? contentType : String(bytes.length); } },
    async arrayBuffer() { return bytes; }
  };
}

function fakeFetch(url) {
  const parsed = new URL(url);
  if (parsed.hostname === 'open.canada.ca' || parsed.hostname === 'data.ontario.ca') {
    return Promise.resolve(response({ success: true, result: { results: [
      { id: 'worker-transition-service', title: 'Worker transition training and employment service', notes: 'Employment training and placement support for workers displaced by automation', tags: [{ display_name: 'employment' }, { display_name: 'training' }] },
      { id: 'worker-data', title: 'Worker displacement statistics dataset', notes: 'Administrative records and statistics', tags: [{ display_name: 'data' }] }
    ] } }));
  }
  if (parsed.hostname === 'api.openalex.org') {
    return Promise.resolve(response({ results: [{ id: 'https://openalex.org/W1', display_name: 'Evaluation of worker retraining and employment support after technological displacement' }] }));
  }
  if (parsed.hostname === 'eutils.ncbi.nlm.nih.gov') {
    return Promise.resolve(response({ esearchresult: { idlist: ['12345678'] } }));
  }
  return Promise.reject(new Error(`unexpected-upstream:${parsed.hostname}`));
}

test('jurisdiction aliases are normalized before source selection', () => {
  assert.equal(normalizeJurisdiction('Ottawa, Canada'), 'CA');
  assert.equal(normalizeJurisdiction('Canada'), 'CA');
  assert.equal(normalizeJurisdiction('AU'), 'AU');
});

test('arbitrary problem discovers interventions and evidence leads without importing effects', async () => {
  const result = await runFullCapacityEngine({
    problem: 'worker displacement from automation',
    jurisdiction: 'Ottawa, Canada',
    fetchImpl: fakeFetch,
    requiredSourceTypes: ['intervention-library'],
    statusQuo: { explicit: true, description: 'current municipal workforce-support approach' },
    decisionContext: { jurisdiction: 'Ottawa, Canada' },
    evidenceCandidateLimit: 10
  });

  assert.equal(result.jurisdiction, 'CA');
  assert.ok(result.interventionDiscovery.candidates.length >= 1);
  assert.ok(result.candidates.some(candidate => /worker transition/i.test(candidate.name)));
  assert.ok(result.evidenceReconnaissance.leadCount >= 1);
  assert.equal(result.evidenceReconnaissance.recommendationEligible, false);
  assert.equal(result.evidenceReconnaissance.effectsImported, false);
  assert.equal(result.interventionDiscovery.recommendationEligible, false);
  assert.equal(result.decisionRun.promotion.recommendationEligible, false);
  assert.equal(result.operational.unknownIsNotZero, true);
  assert.equal(result.readiness.complete, false);
});

test('discovery rejects data-only records from the intervention universe', async () => {
  const result = await runFullCapacityEngine({
    problem: 'worker displacement from automation',
    jurisdiction: 'Canada',
    fetchImpl: fakeFetch,
    requiredSourceTypes: ['intervention-library'],
    statusQuo: { explicit: true }
  });
  assert.ok(result.candidates.every(candidate => !/statistics dataset/i.test(candidate.name)));
});
