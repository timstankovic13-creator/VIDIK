'use strict';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function freezeDecisionSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) throw new TypeError('decision-snapshot-object-required');
  return deepFreeze(structuredClone(snapshot));
}

function recordHumanDecision(snapshot, choice, rationale) {
  if (!Object.isFrozen(snapshot)) throw new TypeError('frozen-snapshot-required');
  if (typeof choice !== 'string' || !choice.trim()) throw new TypeError('human-choice-required');
  if (typeof rationale !== 'string' || !rationale.trim()) throw new TypeError('human-rationale-required');
  return { snapshot, humanDecision: { choice, rationale }, originalRecommendation: snapshot.recommendation ?? null };
}

function reviewOutcome(record, outcome) {
  if (!record?.snapshot || !Object.isFrozen(record.snapshot)) throw new TypeError('frozen-snapshot-required');
  if (!outcome || typeof outcome !== 'object' || Array.isArray(outcome)) throw new TypeError('outcome-object-required');
  return { ...record, outcomeReview: structuredClone(outcome) };
}

function recalibrate(record, modelState) {
  if (!record?.snapshot || !Object.isFrozen(record.snapshot)) throw new TypeError('frozen-snapshot-required');
  if (!modelState || typeof modelState !== 'object' || Array.isArray(modelState)) throw new TypeError('model-state-object-required');
  if (!Number.isInteger(modelState.version) || modelState.version < 1) throw new TypeError('model-state-version-required');
  if (Number.isInteger(record.modelStateVersion) && modelState.version <= record.modelStateVersion) throw new TypeError('model-state-version-must-increase');
  return { ...record, modelState: structuredClone(modelState), modelStateVersion:modelState.version };
}

module.exports = { freezeDecisionSnapshot, recordHumanDecision, reviewOutcome, recalibrate };
