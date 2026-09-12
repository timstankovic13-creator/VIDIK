'use strict';
const assert = require('assert');
const Acquisition = require('../js/data-acquisition');

const manifest = Acquisition.requiredDataManifest({ objective: 'improve verified outcome', problem: 'homelessness', horizon: '2027', geography: 'Ottawa' });
assert.strictEqual(manifest.requirements.length, Acquisition.DATA_DOMAINS.length);
assert.ok(manifest.requirements.every(r => r.status === 'unknown'));
assert.strictEqual(manifest.schemaVersion, 'vidik.data-requirement-manifest.v2');

const sources = Acquisition.rankSources([
  { url: 'https://secondary.example/data', provider: 'secondary', jurisdiction: 'CA', domain: 'local-baseline', tier: 'secondary_discovery' },
  { url: 'https://city.example/data.json', provider: 'city', jurisdiction: 'CA-ON', domain: 'local-baseline', tier: 'official_machine_readable' },
  { url: 'https://research.example/study', provider: 'research', jurisdiction: 'CA', domain: 'causal-evidence', tier: 'independent_causal_research' }
]);
assert.strictEqual(sources[0].tierRank, 1);
assert.strictEqual(sources[2].tierRank, 4);
assert.throws(() => Acquisition.validateSourceDescriptor({ url: 'http://city.example', provider: 'city', jurisdiction: 'CA', domain: 'local-baseline', tier: 'official_machine_readable' }), /https/);
assert.throws(() => Acquisition.validateSourceDescriptor({ url: 'https://127.0.0.1/data', provider: 'city', jurisdiction: 'CA', domain: 'local-baseline', tier: 'official_machine_readable' }), /private-network/);
assert.throws(() => Acquisition.validateSourceDescriptor({ url: 'https://city.example', provider: 'city', jurisdiction: 'CA', domain: 'not-a-domain', tier: 'official_machine_readable' }), /unsupported-data-domain/);
assert.throws(() => Acquisition.validateSourceDescriptor({ url: 'https://u:p@city.example', provider: 'city', jurisdiction: 'CA', domain: 'local-baseline', tier: 'official_machine_readable' }), /credentials/);

const plan = Acquisition.buildAcquisitionPlan({ manifest, candidates: [sources[1], sources[2]] });
assert.strictEqual(plan.steps.find(x => x.domain === 'local-baseline').status, 'SOURCE_FOUND');
assert.strictEqual(plan.steps.find(x => x.domain === 'causal-evidence').status, 'SOURCE_FOUND');
assert.strictEqual(plan.steps.find(x => x.domain === 'cost-resource').status, 'SOURCE_GAP');
assert.ok(plan.sourceDiscovery.missingDomains.includes('cost-resource'));
assert.ok(plan.schemaVersion.endsWith('.v1'));

const fakeFetch = async () => ({ ok: true, status: 200, headers: { get: key => key === 'content-type' ? 'application/json' : null }, arrayBuffer: async () => new TextEncoder().encode('{"value":12}').buffer });
(async () => {
  const source = { url: 'https://city.example/data.json', provider: 'city', jurisdiction: 'CA-ON', domain: 'local-baseline', tier: 'official_machine_readable', datasetId: 'x' };
  const { retrieval, bytes } = await Acquisition.retrieve(source, { fetchImpl: fakeFetch, now: new Date('2026-09-12T00:00:00Z') });
  assert.strictEqual(bytes.length, 12);
  assert.strictEqual(retrieval.schemaVersion, 'vidik.source-retrieval.v2');
  assert.strictEqual(retrieval.contentHash.length, 64);
  assert.deepStrictEqual(Acquisition.parsePayload(bytes, retrieval.contentType).value, { value: 12 });
  const record = Acquisition.normalizeRecord({ source, retrieval, value: 12, unit: 'people', period: '2026-09', geography: 'Ottawa', aggregation: 'point-in-time', extractionMethod: 'json-field', definition: 'people experiencing homelessness' });
  assert.strictEqual(Acquisition.validateRecord(record).valid, true);
  assert.strictEqual(Acquisition.classifyEvidence({ record, claimType: 'context' }).status, 'supported');
  assert.strictEqual(Acquisition.classifyEvidence({ record, claimType: 'causal' }).status, 'potential');
  assert.strictEqual(Acquisition.validateRecord({ ...record, asOf: '2020-01-01' }, { now: new Date('2026-09-12T00:00:00Z'), maxAgeDays: 365 }).failures.includes('stale-source'), true);
  assert.strictEqual(Acquisition.compareSnapshot(retrieval, retrieval).changed, false);
  const result = Acquisition.buildAcquisitionResult({ manifest, candidates: [source], records: [record], gaps: ['cost-resource'] });
  assert.strictEqual(result.coverage.complete, false);
  assert.ok(result.coverage.missingDomains.includes('cost-resource'));
  assert.ok(result.acquisitionHash);
  console.log('data acquisition tests passed');
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
