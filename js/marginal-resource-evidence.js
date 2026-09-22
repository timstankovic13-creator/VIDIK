'use strict';

function finitePositive(value) { return Number.isFinite(Number(value)) && Number(value) > 0; }

function validateMarginalResourceEvidence(record) {
  const failures = [];
  if (!record?.intervention) failures.push('intervention-required');
  if (!record?.resourceUnit) failures.push('resource-unit-required');
  if (!finitePositive(record?.resourceAmount)) failures.push('resource-amount-required');
  if (!finitePositive(record?.incrementalCapacity)) failures.push('incremental-capacity-required');
  if (!finitePositive(record?.incrementalActivity)) failures.push('incremental-activity-required');
  if (!finitePositive(record?.incrementalOutcome)) failures.push('incremental-outcome-required');
  if (!record?.unit) failures.push('outcome-unit-required');
  if (!record?.evidenceId) failures.push('evidence-id-required');
  if (!record?.provenance) failures.push('provenance-required');
  if (!record?.uncertainty || !Number.isFinite(Number(record.uncertainty.low)) || !Number.isFinite(Number(record.uncertainty.high)) || Number(record.uncertainty.low) > Number(record.uncertainty.high)) failures.push('coherent-uncertainty-required');
  if (record?.transportability?.admissible !== true) failures.push('transportability-not-established');
  return { valid: failures.length === 0, failures };
}

function marginalOutcomePerResource(record) {
  const check = validateMarginalResourceEvidence(record);
  if (!check.valid) return { value: null, ...check };
  return { value: Number(record.incrementalOutcome) / Number(record.resourceAmount), ...check };
}

function compareMarginalEvidence(records) {
  const evaluated = (Array.isArray(records) ? records : []).map(record => ({ record, ...marginalOutcomePerResource(record) }));
  const admissible = evaluated.filter(x => x.valid && Number.isFinite(x.value));
  return {
    status: admissible.length ? 'OPTIMIZED' : 'BLOCKED_MISSING_MARGINAL_EVIDENCE',
    winner: admissible.slice().sort((a, b) => b.value - a.value)[0]?.record?.intervention || null,
    candidates: evaluated
  };
}

module.exports = { validateMarginalResourceEvidence, marginalOutcomePerResource, compareMarginalEvidence };
