'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ingestCatalog } = require('../scripts/municipal-adapters');
const { buildMunicipalDecision } = require('../scripts/municipal-evidence-pipeline');
const { createOutcomeLearningStore } = require('../scripts/outcome-learning');
const { resolveMunicipalMapping, assertContextOnlyMapping } = require('../scripts/municipal-parameter-registry');

(async () => {
  for (const city of ['Ottawa', 'Toronto', 'Melbourne']) {
    const ingestion = await ingestCatalog(city, globalThis.fetch, new Date());
    assert.equal(ingestion.provenance.status, 'validated');
    assert.ok(ingestion.recordCount > 0);

    const mapping = resolveMunicipalMapping(city, ingestion.records);
    assertContextOnlyMapping(mapping);
    assert.ok(mapping.semantic);
    assert.ok(mapping.unit);

    const decisionId = `LIVE-${city.toUpperCase()}-${Date.now()}`;
    const result = buildMunicipalDecision({
      city,
      ingestion,
      mapping,
      model: {
        modelId: 'production-live-municipal-context-v2',
        recommend: input => {
          assert.equal(input.geography, city);
          assert.equal(input.evidence.city, city);
          assert.equal(input.evidence.normalizedSha256, ingestion.provenance.normalizedSha256);
          assert.equal(input.parameterLineage.role, 'context');
          assert.equal(input.parameterLineage.causalEligible, false);
          assert.ok(Number.isFinite(input.parameters[mapping.parameterName]));
          return 'context-accepted-causal-effect-still-required';
        },
      },
      now: new Date(Date.now() + 1000),
    });

    assert.equal(result.envelope.status, 'validated');
    assert.equal(result.claim.status, 'validated');
    assert.equal(result.claim.parameter.name, mapping.parameterName);
    assert.equal(result.claim.parameter.causalEligible, false);
    assert.ok(result.decisionInput.recommendation);

    const predicted = result.claim.parameter.value;
    const observed = predicted * 0.9;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `vidik-${city.toLowerCase()}-`));
    const store = createOutcomeLearningStore({ filePath: path.join(dir, 'outcomes.json') });
    const decisionAt = new Date().toISOString();
    const outcomeAt = new Date(Date.now() + 1).toISOString();
    const recorded = store.recordOutcome({ decisionId, parameterName: mapping.parameterName, city, predicted, observed, checkpoint: '6-month', decisionAt, outcomeAt });
    assert.equal(recorded.city, city);
    assert.equal(recorded.error, observed - predicted);

    const signal = store.recalibrationSignal({ decisionId, parameterName: mapping.parameterName, currentValue: predicted, learningRate: 0.5 });
    assert.equal(signal.automaticApply, false);
    assert.ok(Number.isFinite(signal.suggestedValue));

    const lifecycle = store.lifecycle(decisionId, new Date(new Date(decisionAt).setUTCMonth(new Date(decisionAt).getUTCMonth() + 6)));
    assert.equal(lifecycle.find(item => item.checkpoint === '6-month').recorded, true);
    assert.equal(lifecycle.find(item => item.checkpoint === '1-year').recorded, false);
    assert.equal(lifecycle.find(item => item.checkpoint === '2-year').recorded, false);
    assert.equal(lifecycle.find(item => item.checkpoint === '5-year').recorded, false);
    const drift = store.driftReport(decisionId);
    assert.equal(drift.observations, 1);
    const state = store.snapshot();
    assert.ok(state.audit.some(event => event.type === 'OUTCOME_RECORDED'));
    assert.ok(state.audit.some(event => event.type === 'RECALIBRATION_SIGNAL'));

    console.log(`${city}: LIVE -> SEMANTIC MAPPING -> EVIDENCE -> DECISION -> OUTCOME -> RECALIBRATION/DRIFT OK | records=${ingestion.recordCount} | field=${mapping.field} | parameter=${mapping.parameterName} | value=${predicted} | sha256=${ingestion.provenance.normalizedSha256}`);
  }
  console.log('production-real-decision-gamut: PASS');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
