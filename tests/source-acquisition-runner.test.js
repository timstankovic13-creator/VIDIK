'use strict';
const assert = require('assert');
const { requiredDataManifest } = require('../js/data-acquisition');
const { acquireRankedSources } = require('../js/source-acquisition-runner');

const manifest = requiredDataManifest({ objective: 'test', problem: 'test', domains: ['local-baseline'] });
const candidates = [
  { url: 'https://city.example/broken', provider: 'city', jurisdiction: 'CA-ON', domain: 'local-baseline', tier: 'official_machine_readable' },
  { url: 'https://city.example/good', provider: 'city', jurisdiction: 'CA-ON', domain: 'local-baseline', tier: 'official_structured' }
];

(async () => {
  const result = await acquireRankedSources({
    manifest,
    candidates,
    fetchImpl: async url => {
      if (url.endsWith('/broken')) return { ok: false, status: 503, headers: { get: () => null }, arrayBuffer: async () => new ArrayBuffer(0) };
      return { ok: true, status: 200, headers: { get: key => key === 'content-type' ? 'application/json' : null }, arrayBuffer: async () => Buffer.from('{"value":1}').buffer };
    }
  });
  assert.strictEqual(result.complete, false, 'failed ranked source must remain visible as a failure');
  assert.strictEqual(result.acquired.length, 1);
  assert.strictEqual(result.acquired[0].source.url, 'https://city.example/good');
  assert.ok(result.failures.some(x => x.sourceUrl === 'https://city.example/broken'));
  assert.ok(result.snapshots[0].contentHash);
  console.log('source acquisition runner tests passed');
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
