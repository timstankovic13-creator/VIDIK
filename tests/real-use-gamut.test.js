'use strict';

const assert = require('node:assert/strict');
const { ingestCatalog } = require('../scripts/municipal-adapters');
const { buildMunicipalDecision } = require('../scripts/municipal-evidence-pipeline');

function numericField(records) {
  const candidates = new Map();
  const walk = (value, path) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      const n = Number(value);
      if (value !== null && value !== '' && Number.isFinite(n) && path) candidates.set(path, (candidates.get(path) || 0) + 1);
      return;
    }
    for (const [key, child] of Object.entries(value)) walk(child, path ? `${path}.${key}` : key);
  };
  for (const record of records) walk(record, '');
  const best = [...candidates.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] !== records.length) throw new Error('no-common-numeric-field');
  return best[0];
}

(async () => {
  for (const city of ['Ottawa', 'Toronto', 'Melbourne']) {
    const ingestionNow = new Date();
    const ingestion = await ingestCatalog(city, globalThis.fetch, ingestionNow);
    assert.equal(ingestion.city, city);
    assert.ok(ingestion.recordCount > 0);
    assert.equal(ingestion.provenance.status, 'validated');
    const field = numericField(ingestion.records);
    let executed = false;
    const result = buildMunicipalDecision({
      city,
      ingestion,
      mapping: { field, parameterName: 'live_source_metric', unit: 'source-record-value', aggregation: 'mean' },
      model: {
        modelId: 'real-use-gamut-v1',
        recommend: input => {
          executed = true;
          assert.equal(input.geography, city);
          assert.equal(input.evidence.city, city);
          assert.equal(input.evidence.normalizedSha256, ingestion.provenance.normalizedSha256);
          assert.ok(Number.isFinite(input.parameters.live_source_metric));
          return 'live-evidence-accepted';
        },
      },
      now: new Date(),
    });
    assert.equal(result.envelope.status, 'validated');
    assert.equal(result.claim.status, 'validated');
    assert.ok(executed, `${city}: decision model did not execute`);
    assert.equal(result.decisionInput.recommendation, 'live-evidence-accepted');
    console.log(`${city}: LIVE -> NORMALIZED -> EVIDENCE -> DECISION OK | records=${ingestion.recordCount} | field=${field} | sha256=${ingestion.provenance.normalizedSha256}`);
  }
  console.log('real-use-gamut: PASS');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
