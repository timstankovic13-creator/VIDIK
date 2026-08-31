'use strict';

const assert = require('assert');
const { ADAPTERS, adapterFor, normalizeRecords, provenance, validateCatalog } = require('../scripts/municipal-adapters');
const { validateExpansion, EXPECTED_RECORDS } = require('../scripts/wup-expansion');

for (const city of ['Ottawa', 'Toronto', 'Melbourne']) {
  const adapter = adapterFor(city);
  assert.strictEqual(adapter.city, city);
  assert.ok(adapter.catalogUrl.startsWith('https://'));
  assert.strictEqual(adapter.mode, 'controlled-server-side');
}
assert.strictEqual(Object.keys(ADAPTERS).length, 3);
assert.deepStrictEqual(normalizeRecords([{ z: 1, a: 2 }]), [{ a: 2, z: 1 }]);
const p = provenance({ city: 'Ottawa', sourceUrl: ADAPTERS.Ottawa.catalogUrl, retrievedAt: '2026-08-31T00:00:00Z', records: [{ id: 1 }] });
assert.strictEqual(p.status, 'validated');
assert.strictEqual(p.normalizedSha256.length, 64);
assert.throws(() => adapterFor('NotARealCity'), /unsupported-municipality/);
assert.throws(() => validateExpansion([]), /expansion-record-count/);
const records = Array.from({ length: EXPECTED_RECORDS }, (_, i) => ({ city: `Test-${i}`, country: 'Canada', population: 1000 + i }));
assert.deepStrictEqual(validateExpansion(records), { enabled: true, records: EXPECTED_RECORDS });
assert.throws(() => validateExpansion(records.map((r, i) => i === 0 ? { ...r, population: 50000 } : r)), /expansion-invalid-population/);

// Melbourne's documented Explore API has appeared as either `results` or `records` in source responses.
assert.strictEqual(validateCatalog('Melbourne', { results: [{ id: 1 }] }), true);
assert.strictEqual(validateCatalog('Melbourne', { records: [{ id: 1 }] }), true);
assert.throws(() => validateCatalog('Melbourne', { total_count: 1 }), /melbourne-records-shape-invalid/);

console.log('municipal-adapter-and-wup-contracts: PASS');
