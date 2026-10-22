'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  retrieveWithTransientRetry,
  MAX_TRANSIENT_SOURCE_RETRIES
} = require('../js/source-driven-intervention-discovery');

function response(status, body = '{}', contentType = 'application/json') {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get(name) { return name.toLowerCase() === 'content-type' ? contentType : null; } },
    async arrayBuffer() { return Buffer.from(body); }
  };
}

test('discovery retries transient 5xx retrieval failures without weakening terminal failures', async () => {
  let calls = 0;
  const source = {
    sourceId: 'ca-program-discovery',
    provider: 'Government of Canada Open Government Portal',
    jurisdiction: 'CA',
    domain: 'intervention-universe',
    tier: 'official_machine_readable',
    accessMethod: 'ckan-action-api',
    url: 'https://open.canada.ca/data/en/api/3/action/package_search?q=test'
  };
  const result = await retrieveWithTransientRetry(source, {
    fetchImpl: async () => {
      calls += 1;
      return calls === 1 ? response(503) : response(200, '{"success":true,"result":{"results":[]}}');
    },
    now: new Date('2026-09-28T00:00:00Z')
  });
  assert.equal(calls, 2);
  assert.equal(result.retrieval.status, 200);
});

test('discovery does not retry terminal 4xx retrieval failures', async () => {
  let calls = 0;
  const source = {
    sourceId: 'ca-program-discovery',
    provider: 'Government of Canada Open Government Portal',
    jurisdiction: 'CA',
    domain: 'intervention-universe',
    tier: 'official_machine_readable',
    accessMethod: 'ckan-action-api',
    url: 'https://open.canada.ca/data/en/api/3/action/package_search?q=test'
  };
  await assert.rejects(
    retrieveWithTransientRetry(source, {
      fetchImpl: async () => { calls += 1; return response(404); },
      now: new Date('2026-09-28T00:00:00Z')
    }),
    /upstream-http:404/
  );
  assert.equal(calls, 1);
  assert.equal(MAX_TRANSIENT_SOURCE_RETRIES, 2);
});
