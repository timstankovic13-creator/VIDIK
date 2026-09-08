'use strict';

const assert = require('assert');
const { ADAPTERS } = require('../scripts/municipal-adapters');
const {
  assessFreshness,
  buildEvidenceEnvelope,
  ingestAllMunicipalities,
} = require('../scripts/municipal-ingestion');

const NOW = new Date('2026-09-07T20:00:00Z');

assert.strictEqual(assessFreshness({ city: 'Ottawa', retrievedAt: '2026-09-07T19:00:00Z', now: NOW }).status, 'fresh');
assert.strictEqual(assessFreshness({ city: 'Melbourne', retrievedAt: '2026-08-01T20:00:00Z', now: NOW }).status, 'stale');
assert.throws(() => assessFreshness({ city: 'Ottawa', retrievedAt: '2026-09-08T00:00:00Z', now: NOW }), /retrieved-at-in-future/);
assert.throws(() => assessFreshness({ city: 'Ottawa', retrievedAt: 'not-a-date', now: NOW }), /invalid-retrieved-at/);

const canonicalFetch = async url => {
  if (url === ADAPTERS.Ottawa.discoveryUrl) {
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ collections: [{ id: 'traffic-collisions', title: 'Traffic collisions' }] }) };
  }
  if (url.includes('/collections/traffic-collisions/items')) {
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ features: [{ id: 1, severity: 'fatal' }] }) };
  }
  if (url === ADAPTERS.Toronto.discoveryUrl) {
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ success: true, result: { results: [{ name: 'traffic-collisions', resources: [{ id: 'resource-1', datastore_active: true }] }] } }) };
  }
  if (url.includes('datastore_search')) {
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ success: true, result: { records: [{ _id: 1, severity: 'Fatal' }] } }) };
  }
  if (url.includes('pedestrian-counting-system-monthly-counts-per-hour')) {
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ results: [{ sensor_id: 5, count: 12 }] }) };
  }
  throw new Error(`unexpected-url:${url}`);
};

(async () => {
  const all = await ingestAllMunicipalities(canonicalFetch, NOW);
  assert.deepStrictEqual(Object.keys(all), ['Ottawa', 'Toronto', 'Melbourne']);
  for (const city of Object.keys(all)) {
    assert.strictEqual(all[city].schemaVersion, 'municipal-evidence.v1');
    assert.strictEqual(all[city].status, 'validated');
    assert.strictEqual(all[city].freshness.status, 'fresh');
    assert.ok(all[city].evidence.normalizedSha256.match(/^[a-f0-9]{64}$/));
    assert.ok(all[city].evidence.recordCount > 0);
  }

  const stale = JSON.parse(JSON.stringify(all.Ottawa));
  stale.provenance = undefined;
  assert.throws(() => buildEvidenceEnvelope({
    city: 'Ottawa',
    ingestion: {
      city: 'Ottawa',
      datasetId: 'traffic-collisions',
      sourceUrl: all.Ottawa.source.sourceUrl,
      sourceKind: 'collection-items',
      records: all.Ottawa.evidence.records,
      provenance: { retrievedAt: '2026-08-20T00:00:00Z', normalizedSha256: all.Ottawa.evidence.normalizedSha256 },
    },
    now: NOW,
  }), /stale-source:Ottawa/);

  assert.throws(() => buildEvidenceEnvelope({
    city: 'Ottawa',
    ingestion: {
      city: 'Ottawa',
      datasetId: 'traffic-collisions',
      sourceUrl: all.Ottawa.source.sourceUrl,
      sourceKind: 'collection-items',
      records: all.Ottawa.evidence.records,
      provenance: { retrievedAt: '2026-09-07T19:00:00Z', normalizedSha256: '0'.repeat(64) },
    },
    now: NOW,
  }), /provenance-hash-mismatch:Ottawa/);

  console.log('municipal-ingestion-freshness-fail-closed: PASS');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
