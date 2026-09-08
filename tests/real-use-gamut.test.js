'use strict';

const assert = require('node:assert/strict');
const { ingestCatalog } = require('../scripts/municipal-adapters');
const { buildMunicipalDecision } = require('../scripts/municipal-evidence-pipeline');

function numericField(records) {
  const candidates = new Map();
  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      const n = Number(value);
      if (value !== null && value !== '' && Number.isFinite(n)) candidates.set(key, (candidates.get(key) || 0) + 1);
    }
  }
  const best = [...candidates.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] < Math.max(1, Math.ceil(records.length * 0.8))) throw new Error('no-stable-numeric-field');
  return best[0];
}

(async () => {
  const now = new Date();
  for (const city of ['Ottawa', 'Toronto', 'Melbourne']) {
    const ingestion = await ingestCatalog(city, globalThis.fetch, now);
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
          return input.parameters.live_source_metric >= 0 ? 'live-evidence-accepted' : 'live-evidence-rejected';
        },
      },
      now,
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
