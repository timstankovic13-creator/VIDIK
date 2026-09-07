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

  const redirectFetch = async (url, options) => {
    calls.push(url);
    assert.strictEqual(options.redirect, 'manual');
    return {
      ok: false,
      status: 302,
      headers: { get(name) { return name.toLowerCase() === 'location' ? 'https://example.com/escape' : null; } },
    };
  };
  await assert.rejects(() => fetchJson(ADAPTERS.Ottawa.discoveryUrl, redirectFetch), /source-host-not-allowlisted:example.com/);

  const sameHostRedirectFetch = async (url, options) => {
    calls.push(url);
    assert.strictEqual(options.redirect, 'manual');
    if (url === ADAPTERS.Ottawa.discoveryUrl) {
      return {
        ok: false,
        status: 302,
        headers: { get(name) { return name.toLowerCase() === 'location' ? '/api/search/v1/collections?page=2' : null; } },
      };
    }
    return { ok: true, status: 200, async json() { return { collections: [{ id: 'traffic-collisions' }] }; } };
  };
  const redirected = await fetchJson(ADAPTERS.Ottawa.discoveryUrl, sameHostRedirectFetch);
  assert.deepStrictEqual(redirected, { collections: [{ id: 'traffic-collisions' }] });

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
