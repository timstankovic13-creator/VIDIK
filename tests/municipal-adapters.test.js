'use strict';

const assert = require('assert');
const {
  ADAPTERS,
  adapterFor,
  canonicalize,
  normalizeRecord,
  normalizeRecords,
  provenance,
  assertAllowedHttpsUrl,
  validateCatalog,
  resolveSource,
  extractSourceRecords,
} = require('../scripts/municipal-adapters');
const { validateExpansion, EXPECTED_RECORDS } = require('../scripts/wup-expansion');

for (const city of ['Ottawa', 'Toronto', 'Melbourne']) {
  const adapter = adapterFor(city);
  assert.strictEqual(adapter.city, city);
  assert.ok(adapter.catalogUrl.startsWith('https://'));
  assert.ok(adapter.discoveryUrl.startsWith('https://'));
  assert.ok(adapter.datasetHint);
  assert.strictEqual(adapter.mode, 'controlled-server-side');
}
assert.strictEqual(Object.keys(ADAPTERS).length, 3);
assert.deepStrictEqual(normalizeRecord({ z: 1, a: 2 }), { a: 2, z: 1 });
assert.deepStrictEqual(normalizeRecords([{ z: 1, a: 2 }]), [{ a: 2, z: 1 }]);
assert.deepStrictEqual(canonicalize({ b: { z: 1, a: 2 }, a: [{ y: 2, x: 1 }] }), { a: [{ x: 1, y: 2 }], b: { a: 2, z: 1 } });
assert.throws(() => normalizeRecord({ a: 1, ' a ': 2 }), /normalized-key-collision:a/);
assert.throws(() => normalizeRecord({ '   ': 1 }), /invalid-record-key/);
assert.throws(() => normalizeRecord({ value: Infinity }), /non-finite-record-value/);
const p = provenance({ city: 'Ottawa', sourceUrl: ADAPTERS.Ottawa.catalogUrl, discoveryUrl: ADAPTERS.Ottawa.discoveryUrl, retrievedAt: '2026-08-31T00:00:00Z', records: [{ id: 1 }] });
assert.strictEqual(p.schemaVersion, 'municipal-adapter.v3');
assert.strictEqual(p.status, 'validated');
assert.strictEqual(p.normalizedSha256.length, 64);
assert.throws(() => provenance({ city: 'Ottawa', sourceUrl: 'https://example.invalid/data', retrievedAt: '2026-08-31T00:00:00Z', records: [] }), /source-host-not-allowlisted/);
assert.throws(() => assertAllowedHttpsUrl('http://open.ottawa.ca/'), /source-url-must-use-https/);
assert.throws(() => assertAllowedHttpsUrl('https://evil.example/'), /source-host-not-allowlisted/);
assert.throws(() => adapterFor('NotARealCity'), /unsupported-municipality/);
assert.throws(() => validateExpansion([]), /expansion-record-count/);
const records = Array.from({ length: EXPECTED_RECORDS }, (_, i) => ({ city: `Test-${i}`, country: 'Canada', population: 1000 + i }));
assert.deepStrictEqual(validateExpansion(records), { enabled: true, records: EXPECTED_RECORDS });
assert.throws(() => validateExpansion(records.map((r, i) => i === 0 ? { ...r, population: 50000 } : r)), /expansion-invalid-population/);

assert.strictEqual(validateCatalog('Melbourne', { results: [{ id: 1 }] }), true);
assert.strictEqual(validateCatalog('Melbourne', { records: [{ id: 1 }] }), true);
assert.throws(() => validateCatalog('Melbourne', { total_count: 1 }), /melbourne-catalog-shape-invalid/);

(async () => {
  const mockFetch = async url => {
    let body;
    if (url === ADAPTERS.Ottawa.discoveryUrl) {
      body = { collections: [{ id: 'traffic-collisions', title: 'Traffic collisions', description: 'Collision records' }] };
    } else if (url.includes('/collections/traffic-collisions/items')) {
      body = { features: [{ id: 1, properties: { severity: 'fatal' } }] };
    } else if (url === ADAPTERS.Toronto.discoveryUrl) {
      body = { success: true, result: { results: [{ name: 'traffic-collisions', resources: [{ id: 'resource-1', datastore_active: true }] }] } };
    } else if (url.includes('datastore_search')) {
      body = { success: true, result: { records: [{ _id: 1, severity: 'Fatal' }] } };
    } else {
      body = { total_count: 1, results: [{ id: 1 }] };
    }
    return { ok: true, status: 200, async json() { return body; } };
  };

  const ottawa = await resolveSource('Ottawa', mockFetch);
  assert.match(ottawa.sourceUrl, /traffic-collisions\/items/);
  assert.strictEqual(ottawa.datasetId, 'traffic-collisions');

  const toronto = await resolveSource('Toronto', mockFetch);
  assert.match(toronto.sourceUrl, /datastore_search/);
  assert.strictEqual(toronto.datasetId, 'resource-1');

  assert.deepStrictEqual(extractSourceRecords('Ottawa', { features: [{ id: 1 }] }), [{ id: 1 }]);
  assert.deepStrictEqual(extractSourceRecords('Toronto', { result: { records: [{ id: 1 }] } }), [{ id: 1 }]);
  assert.deepStrictEqual(extractSourceRecords('Melbourne', { results: [{ id: 1 }] }), [{ id: 1 }]);

  console.log('municipal-adapter-source-resolution: PASS');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});

console.log('municipal-adapter-and-wup-contracts: PASS');
