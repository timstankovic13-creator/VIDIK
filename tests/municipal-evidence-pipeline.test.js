'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { provenance } = require('../scripts/municipal-adapters');
const { buildEvidenceEnvelope } = require('../scripts/municipal-ingestion');
const { buildMunicipalDecision, buildEvidenceClaim, aggregate } = require('../scripts/municipal-evidence-pipeline');

function ingestion(city, records, now) {
  const source = {
    Ottawa: 'https://open.ottawa.ca/api/search/v1/collections/collision/items',
    Toronto: 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/datastore_search?resource_id=fixture',
    Melbourne: 'https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/fixture/records?limit=10',
  }[city];
  return {
    city,
    sourceUrl: source,
    sourceKind: 'fixture',
    datasetId: `${city.toLowerCase()}-fixture`,
    records,
    provenance: provenance({
      city,
      sourceUrl: source,
      discoveryUrl: source,
      datasetHint: 'fixture',
      retrievedAt: now.toISOString(),
      records,
    }),
  };
}

test('Ottawa evidence becomes a validated parameter and model input', () => {
  const now = new Date('2026-09-07T12:00:00.000Z');
  const result = buildMunicipalDecision({
    city: 'Ottawa',
    ingestion: ingestion('Ottawa', [{ collisions: 10 }, { collisions: 20 }, { collisions: 30 }], now),
    mapping: { field: 'collisions', parameterName: 'collision_rate_proxy', unit: 'records', aggregation: 'mean' },
    model: { modelId: 'fixture-model-1', recommend: input => input.parameters.collision_rate_proxy > 15 ? 'prioritize-road-safety' : 'no-change' },
    now,
  });
  assert.equal(result.claim.status, 'validated');
  assert.equal(result.claim.parameter.value, 20);
  assert.equal(result.decisionInput.parameters.collision_rate_proxy, 20);
  assert.equal(result.decisionInput.recommendation, 'prioritize-road-safety');
  assert.equal(result.decisionInput.evidence.normalizedSha256, result.envelope.evidence.normalizedSha256);
});

test('Toronto and Melbourne preserve provenance through the same chain', () => {
  const now = new Date('2026-09-07T12:00:00.000Z');
  for (const city of ['Toronto', 'Melbourne']) {
    const envelope = buildEvidenceEnvelope({
      city,
      ingestion: ingestion(city, [{ value: 2 }, { value: 4 }], now),
      now,
    });
    const claim = buildEvidenceClaim(envelope, { field: 'value', parameterName: 'observed_metric', unit: 'count' });
    assert.equal(claim.parameter.value, 3);
    assert.equal(claim.evidence.city, city);
    assert.equal(claim.evidence.normalizedSha256, envelope.evidence.normalizedSha256);
  }
});

test('unsupported aggregation fails closed', () => {
  assert.throws(() => aggregate([1, 2], 'median'), /unsupported-aggregation/);
});

test('non-numeric source values fail closed before model execution', () => {
  const now = new Date('2026-09-07T12:00:00.000Z');
  const envelope = buildEvidenceEnvelope({
    city: 'Ottawa',
    ingestion: ingestion('Ottawa', [{ value: 'not-a-number' }], now),
    now,
  });
  assert.throws(() => buildEvidenceClaim(envelope, { field: 'value', parameterName: 'observed_metric' }), /non-finite-parameter/);
});

test('stale evidence cannot enter the parameter chain', () => {
  const now = new Date('2026-09-07T12:00:00.000Z');
  const old = new Date('2026-08-20T12:00:00.000Z');
  assert.throws(() => buildMunicipalDecision({
    city: 'Ottawa',
    ingestion: ingestion('Ottawa', [{ value: 1 }], old),
    mapping: { field: 'value', parameterName: 'observed_metric' },
    model: { modelId: 'must-not-run', recommend: () => { throw new Error('model-executed'); } },
    now,
  }), /stale-source/);
});
