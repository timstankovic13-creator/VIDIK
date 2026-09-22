'use strict';

const assert = require('assert');
const fs = require('fs');
const { allocate } = require('../js/engine');
const adapters = require('../js/city-source-adapters');

// Decision-engine hostile cases.
{
  const result = allocate(100, [
    { id: 'a', min: 50, max: 100, score: 2 },
    { id: 'b', min: 50, max: 100, score: 1 }
  ]);
  assert.strictEqual(result.blocked, false);
  assert.strictEqual(result.minimumsSatisfied, true);
  assert.strictEqual(result.withinCaps, true);
  assert.strictEqual(result.conserved, true);
  assert.strictEqual(result.allocations.a, 50);
  assert.strictEqual(result.allocations.b, 50);
}
assert.strictEqual(allocate(100, [{ id: 'a', min: 60, max: 100, score: 1 }]).blocked, true);
assert.strictEqual(allocate(100, [{ id: 'a', min: 0, max: 100, score: 1 }, { id: 'a', min: 0, max: 100, score: 2 }]).blocked, true);
assert.strictEqual(allocate(100, [{ id: 'a', min: 0, max: 100, score: NaN }]).blocked, true);
assert.strictEqual(allocate(100, [{ id: 'a', min: 0, max: 100, score: 1 }], 0).blocked, true);
assert.strictEqual(allocate(100, [{ id: 'a', min: 0, max: 100, score: 1 }], 1).conserved, true);

// Municipal provenance hostile cases.
for (const city of adapters.cities) {
  const p = adapters.provenance(city, 'record-1', '2026-09-05T12:00:00Z');
  assert.strictEqual(adapters.validate({ city, provenance: p }).valid, true);
  assert.strictEqual(adapters.validate({ city, provenance: { ...p, provider: 'wrong-provider' } }).reason, 'provenance-provider-mismatch');
  assert.strictEqual(adapters.validate({ city, provenance: { ...p, jurisdiction: 'XX-XX' } }).reason, 'provenance-jurisdiction-mismatch');
  assert.strictEqual(adapters.validate({ city, provenance: { ...p, sourceType: 'unknown' } }).reason, 'provenance-source-type-mismatch');
  assert.strictEqual(adapters.validate({ city, provenance: { ...p, sourceUrl: 'http://example.com/' } }).reason, 'provenance-source-mismatch');
}
assert.throws(() => adapters.provenance('Ottawa', 'record-1', 'not-a-date'), /invalid-retrieved-at/);
assert.strictEqual(adapters.decisionContext('Ottawa', {
  status: 'verified',
  identity: { geonameid: 123, latitude: 45.42, longitude: -75.69 },
  enrichment: { provider: 'WorldPop', geonameid: 123, population: 1000 },
  provenance: { identity: { provider: 'GeoNames', record_id: 123 }, enrichment: { provider: 'WorldPop', record_id: 123 } }
}).population.value, 1000);
assert.throws(() => adapters.decisionContext('Ottawa', {
  status: 'verified',
  identity: { geonameid: 123, latitude: 'not-number', longitude: -75.69 },
  enrichment: { provider: 'WorldPop', geonameid: 123, population: 1000 },
  provenance: { identity: { provider: 'GeoNames', record_id: 123 }, enrichment: { provider: 'WorldPop', record_id: 123 } }
}), /municipal-context-geonames-id-mismatch/);

// Production-readiness guardrails: CI must use Node 24 and fail closed on package install.
const workflow = fs.readFileSync('.github/workflows/9-3-full-regression.yml', 'utf8');
assert.match(workflow, /node-version:\s*24/);
assert.match(workflow, /set -euo pipefail/);
assert.match(workflow, /npm (?:ci|install)/);

console.log('hostile-engine-and-production-readiness-15: PASS');
