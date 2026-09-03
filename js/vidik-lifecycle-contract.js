'use strict';

// Minimal lifecycle contract. It is intentionally separate from production causal inference.
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
  return { snapshot, humanDecision: { choice, rationale }, originalRecommendation: snapshot.recommendation ?? null };
}

function reviewOutcome(record, outcome) {
  if (!record?.snapshot || !Object.isFrozen(record.snapshot)) throw new TypeError('frozen-snapshot-required');
  return { ...record, outcomeReview: structuredClone(outcome) };
}

function recalibrate(record, modelState) {
  if (!record?.snapshot || !Object.isFrozen(record.snapshot)) throw new TypeError('frozen-snapshot-required');
  return { ...record, modelState: structuredClone(modelState), modelStateVersion: (modelState?.version ?? 0) };
}

module.exports = { freezeDecisionSnapshot, recordHumanDecision, reviewOutcome, recalibrate };
