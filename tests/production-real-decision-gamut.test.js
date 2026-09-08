'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ingestCatalog } = require('../scripts/municipal-adapters');
const { buildMunicipalDecision } = require('../scripts/municipal-evidence-pipeline');
const { createOutcomeLearningStore } = require('../scripts/outcome-learning');

function numericField(records) {
  const candidates = new Map();
  const walk = (value, pathName) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      const n = Number(value);
      if (value !== null && value !== '' && Number.isFinite(n) && pathName) candidates.set(pathName, (candidates.get(pathName) || 0) + 1);
      return;
    }
    for (const [key, child] of Object.entries(value)) walk(child, pathName ? `${pathName}.${key}` : key);
  };
  for (const record of records) walk(record, '');
  const best = [...candidates.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] !== records.length) throw new Error('no-common-numeric-field');
  return best[0];
}

function readNested(record, field) {
  return field.split('.').reduce((value, key) => value == null ? undefined : value[key], record);
}

(async () => {
  for (const city of ['Ottawa', 'Toronto', 'Melbourne']) {
    const ingestion = await ingestCatalog(city, globalThis.fetch, new Date());
    assert.equal(ingestion.provenance.status, 'validated');
    assert.ok(ingestion.recordCount > 0);

    const field = numericField(ingestion.records);
    const values = ingestion.records.map(record => Number(readNested(record, field)));
    const liveValue = values.reduce((a, b) => a + b, 0) / values.length;
    assert.ok(Number.isFinite(liveValue));

    const decisionId = `LIVE-${city.toUpperCase()}-${Date.now()}`;
    const result = buildMunicipalDecision({
      city,
      ingestion,
      mapping: { field, parameterName: 'live_source_metric', unit: 'source-record-value', aggregation: 'mean' },
      model: {
        modelId: 'production-live-evidence-v1',
        recommend: input => {
          assert.equal(input.geography, city);
          assert.equal(input.evidence.city, city);
          assert.equal(input.evidence.normalizedSha256, ingestion.provenance.normalizedSha256);
          assert.ok(Number.isFinite(input.parameters.live_source_metric));
          return input.parameters.live_source_metric >= 0 ? 'continue' : 'review-negative-source-metric';
        },
      },
      now: new Date(),
    });

    assert.equal(result.envelope.status, 'validated');
    assert.equal(result.claim.status, 'validated');
    assert.ok(result.decisionInput.recommendation);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `vidik-${city.toLowerCase()}-`));
    const store = createOutcomeLearningStore({ filePath: path.join(dir, 'outcomes.json') });
    const predicted = liveValue;
    const observed = liveValue * 0.9;
    const decisionAt = new Date().toISOString();
    const outcomeAt = new Date(Date.now() + 1).toISOString();
    const recorded = store.recordOutcome({ decisionId, parameterName: 'live_source_metric', city, predicted, observed, checkpoint: '6-month', decisionAt, outcomeAt });
    assert.equal(recorded.city, city);
    assert.equal(recorded.error, observed - predicted);

    const signal = store.recalibrationSignal({ decisionId, parameterName: 'live_source_metric', currentValue: predicted, learningRate: 0.5 });
    assert.equal(signal.automaticApply, false);
    assert.ok(Number.isFinite(signal.suggestedValue));

    const lifecycle = store.lifecycle(decisionId, new Date(new Date(decisionAt).setUTCMonth(new Date(decisionAt).getUTCMonth() + 6)));
    assert.equal(lifecycle.find(item => item.checkpoint === '6-month').recorded, true);
    const state = store.snapshot();
    assert.ok(state.audit.some(event => event.type === 'OUTCOME_RECORDED'));
    assert.ok(state.audit.some(event => event.type === 'RECALIBRATION_SIGNAL'));

    console.log(`${city}: LIVE -> EVIDENCE -> DECISION -> OUTCOME -> RECALIBRATION OK | records=${ingestion.recordCount} | field=${field} | recommendation=${result.decisionInput.recommendation} | sha256=${ingestion.provenance.normalizedSha256}`);
  }
  console.log('production-real-decision-gamut: PASS');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
