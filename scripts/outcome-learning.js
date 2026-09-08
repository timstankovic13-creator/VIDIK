'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const CHECKPOINTS = Object.freeze({ '6-month': 6, '1-year': 12, '2-year': 24, '5-year': 60 });

function fail(code, detail) {
  const error = new Error(detail ? `${code}: ${detail}` : code);
  error.code = code;
  throw error;
}
function finiteNumber(value, field) {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`invalid-${field}`);
  return value;
}
function iso(value, field) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) fail(`invalid-${field}`);
  return date.toISOString();
}
function validateCheckpoint(checkpoint) {
  if (!Object.hasOwn(CHECKPOINTS, checkpoint)) fail('invalid-checkpoint');
  return checkpoint;
}
function emptyState() { return { version: 1, outcomes: [], recalibrations: [], audit: [] }; }
function readState(filePath) {
  if (!fs.existsSync(filePath)) return emptyState();
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (error) { fail('corrupt-learning-store', error.message); }
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.outcomes) || !Array.isArray(parsed.recalibrations) || !Array.isArray(parsed.audit)) fail('invalid-learning-store');
  return parsed;
}
function writeState(filePath, state) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  fs.renameSync(temp, filePath);
}
function addAudit(state, type, payload, at) { state.audit.push({ id: crypto.randomUUID(), type, at, ...payload }); }
function driftForOutcome(outcome, threshold) {
  const scale = Math.max(Math.abs(outcome.predicted), 1);
  const relativeError = Math.abs(outcome.error) / scale;
  return { flagged: Math.abs(outcome.error) >= threshold.absolute || relativeError >= threshold.relative, absoluteError: Math.abs(outcome.error), relativeError, thresholds: { ...threshold } };
}

function createOutcomeLearningStore(options = {}) {
  const filePath = options.filePath || path.join(process.cwd(), 'data', 'outcome-learning.json');
  const threshold = { absolute: options.driftThreshold?.absolute ?? 10, relative: options.driftThreshold?.relative ?? 0.10 };
  finiteNumber(threshold.absolute, 'drift-threshold-absolute');
  finiteNumber(threshold.relative, 'drift-threshold-relative');
  if (threshold.absolute < 0 || threshold.relative < 0) fail('invalid-drift-threshold');

  function transaction(mutator) {
    const state = readState(filePath);
    const result = mutator(state);
    writeState(filePath, state);
    return result;
  }

  return {
    filePath,
    snapshot() { return readState(filePath); },

    recordOutcome(input = {}) {
      if (!input.decisionId || typeof input.decisionId !== 'string') fail('invalid-decision-id');
      if (!input.parameterName || typeof input.parameterName !== 'string') fail('invalid-parameter-name');
      if (input.city !== undefined && typeof input.city !== 'string') fail('invalid-city');
      const predicted = finiteNumber(input.predicted, 'predicted');
      const observed = finiteNumber(input.observed, 'observed');
      const checkpoint = validateCheckpoint(input.checkpoint);
      const decisionAt = iso(input.decisionAt, 'decision-at');
      const outcomeAt = iso(input.outcomeAt || new Date().toISOString(), 'outcome-at');
      if (new Date(outcomeAt) < new Date(decisionAt)) fail('outcome-before-decision');
      const outcome = { id: input.id || crypto.randomUUID(), decisionId: input.decisionId, parameterName: input.parameterName, city: input.city || null, predicted, observed, error: observed - predicted, checkpoint, checkpointMonths: CHECKPOINTS[checkpoint], decisionAt, outcomeAt };
      outcome.drift = driftForOutcome(outcome, threshold);
      return transaction(state => {
        if (state.outcomes.some(item => item.id === outcome.id)) fail('duplicate-outcome-id');
        state.outcomes.push(outcome);
        addAudit(state, 'OUTCOME_RECORDED', { outcomeId: outcome.id, decisionId: outcome.decisionId, checkpoint }, outcomeAt);
        if (outcome.drift.flagged) addAudit(state, 'DRIFT_SIGNAL', { outcomeId: outcome.id, decisionId: outcome.decisionId, parameterName: outcome.parameterName, drift: outcome.drift }, outcomeAt);
        return outcome;
      });
    },

    lifecycle(decisionId, now = new Date()) {
      if (!decisionId || typeof decisionId !== 'string') fail('invalid-decision-id');
      const nowIso = iso(now, 'now');
      const state = readState(filePath);
      const outcomes = state.outcomes.filter(item => item.decisionId === decisionId);
      const latest = new Map(outcomes.map(item => [item.checkpoint, item]));
      return Object.entries(CHECKPOINTS).map(([checkpoint, months]) => {
        const outcome = latest.get(checkpoint) || null;
        let due = false;
        if (outcomes.length) {
          const dueAt = new Date(outcomes[0].decisionAt);
          dueAt.setUTCMonth(dueAt.getUTCMonth() + months);
          due = new Date(nowIso) >= dueAt;
        }
        return { checkpoint, months, due, recorded: Boolean(outcome), outcome };
      });
    },

    recalibrationSignal(input = {}) {
      if (!input.decisionId || typeof input.decisionId !== 'string') fail('invalid-decision-id');
      if (!input.parameterName || typeof input.parameterName !== 'string') fail('invalid-parameter-name');
      const currentValue = finiteNumber(input.currentValue, 'current-value');
      const learningRate = input.learningRate === undefined ? 0.5 : finiteNumber(input.learningRate, 'learning-rate');
      if (learningRate < 0 || learningRate > 1) fail('invalid-learning-rate');
      const state = readState(filePath);
      const outcomes = state.outcomes.filter(item => item.decisionId === input.decisionId && item.parameterName === input.parameterName);
      if (!outcomes.length) fail('no-outcomes-for-recalibration');
      const meanError = outcomes.reduce((sum, item) => sum + item.error, 0) / outcomes.length;
      const signal = { id: crypto.randomUUID(), decisionId: input.decisionId, parameterName: input.parameterName, currentValue, observations: outcomes.length, meanError, suggestedDelta: meanError * learningRate, suggestedValue: currentValue + meanError * learningRate, learningRate, automaticApply: false, generatedAt: new Date().toISOString() };
      return transaction(next => { next.recalibrations.push(signal); addAudit(next, 'RECALIBRATION_SIGNAL', { signalId: signal.id, decisionId: signal.decisionId, parameterName: signal.parameterName, automaticApply: false }, signal.generatedAt); return signal; });
    },

    driftReport(decisionId) {
      if (!decisionId || typeof decisionId !== 'string') fail('invalid-decision-id');
      const state = readState(filePath);
      const outcomes = state.outcomes.filter(item => item.decisionId === decisionId);
      const absoluteErrors = outcomes.map(item => Math.abs(item.error));
      const meanAbsoluteError = absoluteErrors.length ? absoluteErrors.reduce((a, b) => a + b, 0) / absoluteErrors.length : 0;
      const flagged = outcomes.filter(item => item.drift.flagged);
      return { decisionId, observations: outcomes.length, meanAbsoluteError, flaggedCount: flagged.length, flaggedOutcomeIds: flagged.map(item => item.id), driftThreshold: { ...threshold } };
    },
  };
}

module.exports = { CHECKPOINTS, createOutcomeLearningStore };
