'use strict';

const assert = require('assert');
const { ADAPTERS, fetchJson, ingestCatalog, normalizeRecord, assertAllowedHttpsUrl } = require('../scripts/municipal-adapters');

assert.throws(() => assertAllowedHttpsUrl('https://example.com/'), /source-host-not-allowlisted/);
assert.throws(() => assertAllowedHttpsUrl('http://open.ottawa.ca/'), /source-url-must-use-https/);
assert.throws(() => normalizeRecord({ nested: { value: NaN } }), /non-finite-record-value/);

(async () => {
  const calls = [];
  const failingFetch = async url => {
    calls.push(url);
    return { ok: false, status: 503, async json() { return {}; } };
  };
  await assert.rejects(() => fetchJson(ADAPTERS.Ottawa.discoveryUrl, failingFetch), /upstream-http:503/);
  assert.strictEqual(calls.length, 3);

  const emptyFetch = async url => ({ ok: true, status: 200, async json() {
    if (url === ADAPTERS.Ottawa.discoveryUrl) return { collections: [{ id: 'traffic-collisions', title: 'Traffic collisions' }] };
    return { features: [] };
  } });
  await assert.rejects(() => ingestCatalog('Ottawa', emptyFetch), /empty-source:Ottawa/);

  console.log('municipal-production-gate: PASS');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
