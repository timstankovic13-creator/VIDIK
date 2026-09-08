'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createOutcomeLearningStore } = require('../scripts/outcome-learning');

function tempStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vidik-learning-'));
  return { dir, filePath: path.join(dir, 'outcomes.json') };
}
const decision = { decisionId: 'VIDIK-OTTAWA-001', parameterName: 'collision_rate_proxy', city: 'Ottawa', decisionAt: '2026-01-01T00:00:00.000Z' };

test('outcomes survive a new store instance and preserve audit history', () => {
  const { filePath } = tempStore();
  const first = createOutcomeLearningStore({ filePath });
  const recorded = first.recordOutcome({ ...decision, predicted: 100, observed: 85, checkpoint: '6-month', outcomeAt: '2026-07-01T00:00:00.000Z' });
  assert.equal(recorded.error, -15);
  assert.equal(recorded.drift.flagged, true);
  const second = createOutcomeLearningStore({ filePath });
  const state = second.snapshot();
  assert.equal(state.outcomes.length, 1);
  assert.equal(state.outcomes[0].id, recorded.id);
  assert.equal(state.audit.some(event => event.type === 'OUTCOME_RECORDED'), true);
  assert.equal(state.audit.some(event => event.type === 'DRIFT_SIGNAL'), true);
});

test('all lifecycle checkpoints are represented and become due by elapsed time', () => {
  const { filePath } = tempStore();
  const store = createOutcomeLearningStore({ filePath });
  store.recordOutcome({ ...decision, predicted: 100, observed: 100, checkpoint: '6-month', outcomeAt: '2026-07-01T00:00:00.000Z' });
  const lifecycle = store.lifecycle(decision.decisionId, '2031-02-01T00:00:00.000Z');
  assert.deepEqual(lifecycle.map(item => item.checkpoint), ['6-month', '1-year', '2-year', '5-year']);
  assert.deepEqual(lifecycle.map(item => item.months), [6, 12, 24, 60]);
  assert.equal(lifecycle.every(item => item.due), true);
  assert.equal(lifecycle[0].recorded, true);
  assert.equal(lifecycle[1].recorded, false);
});

test('recalibration is persisted and never auto-applies a parameter change', () => {
  const { filePath } = tempStore();
  const store = createOutcomeLearningStore({ filePath });
  store.recordOutcome({ ...decision, predicted: 100, observed: 80, checkpoint: '6-month', outcomeAt: '2026-07-01T00:00:00.000Z' });
  store.recordOutcome({ ...decision, predicted: 100, observed: 90, checkpoint: '1-year', outcomeAt: '2027-01-01T00:00:00.000Z' });
  const signal = store.recalibrationSignal({ decisionId: decision.decisionId, parameterName: decision.parameterName, currentValue: 100, learningRate: 0.5 });
  assert.equal(signal.meanError, -15);
  assert.equal(signal.suggestedDelta, -7.5);
  assert.equal(signal.suggestedValue, 92.5);
  assert.equal(signal.automaticApply, false);
  const persisted = createOutcomeLearningStore({ filePath }).snapshot();
  assert.equal(persisted.recalibrations.length, 1);
  assert.equal(persisted.audit.at(-1).type, 'RECALIBRATION_SIGNAL');
});

test('malformed outcomes fail closed before persistence', () => {
  const { filePath } = tempStore();
  const store = createOutcomeLearningStore({ filePath });
  assert.throws(() => store.recordOutcome({ ...decision, predicted: NaN, observed: 10, checkpoint: '6-month' }), /invalid-predicted/);
  assert.throws(() => store.recordOutcome({ ...decision, predicted: 10, observed: 9, checkpoint: '18-month' }), /invalid-checkpoint/);
  assert.throws(() => store.recordOutcome({ ...decision, predicted: 10, observed: 9, checkpoint: '6-month', decisionAt: '2026-07-01T00:00:00.000Z', outcomeAt: '2026-06-01T00:00:00.000Z' }), /outcome-before-decision/);
  assert.equal(store.snapshot().outcomes.length, 0);
});

test('recalibration requires an outcome for the exact decision and parameter', () => {
  const { filePath } = tempStore();
  const store = createOutcomeLearningStore({ filePath });
  assert.throws(() => store.recalibrationSignal({ decisionId: decision.decisionId, parameterName: decision.parameterName, currentValue: 1 }), /no-outcomes-for-recalibration/);
});
