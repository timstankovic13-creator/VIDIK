'use strict';

function finitePositive(value, code) { const n = Number(value); if (!Number.isFinite(n) || n <= 0) throw new Error(code); return n; }
function currencyCode(unit) { const match = String(unit || '').toUpperCase().match(/\b(CAD|USD|AUD|EUR|GBP)\b/); return match ? match[1] : null; }
function compatibleResourceUnits(expected, actual) { if (!expected || !actual) return false; if (String(expected).trim() === String(actual).trim()) return true; const a = currencyCode(expected), b = currencyCode(actual); return Boolean(a && b && a === b); }
function normalizeResourceEnvelope(resourceEnvelope) { const amount = resourceEnvelope?.marginalUnit?.amount; if (amount == null) return { status: 'NOT_SPECIFIED', amount: null, unit: 'CAD', feedback: 'Provide a positive marginal resource amount to activate resource translation.' }; return { status: 'VALID', amount: finitePositive(amount, 'marginal-resource-amount-must-be-positive-finite'), unit: resourceEnvelope.marginalUnit.unit || 'CAD' }; }
function validateModel(intervention, model, resourceUnit = 'CAD') {
  if (!model) return { admissible: false, failures: ['marginal-resource-model-missing'] };
  const required = ['capacityPerCad', 'activityPerCapacity', 'effectPerActivity', 'objectiveMetric'];
  const failures = required.filter(k => (k === 'objectiveMetric' ? typeof model[k] !== 'string' || !model[k].trim() : !Number.isFinite(Number(model[k])) || Number(model[k]) <= 0)).map(k => `${k}-missing-or-invalid`);
  const modelResourceUnit = model.resourceUnit || model.resourceCurrency || 'CAD';
  if (!compatibleResourceUnits(resourceUnit, modelResourceUnit)) failures.push('resource-unit-incompatible');
  if (!model.evidenceIds || !Array.isArray(model.evidenceIds) || model.evidenceIds.length < 3) failures.push('resource-chain-evidence-lineage-incomplete');
  if (model.uncertainty && (!Number.isFinite(Number(model.uncertainty.low)) || !Number.isFinite(Number(model.uncertainty.high)) || Number(model.uncertainty.low) < 0 || Number(model.uncertainty.high) < Number(model.uncertainty.low))) failures.push('resource-chain-uncertainty-invalid');
  return { admissible: failures.length === 0, failures, resourceUnit: modelResourceUnit };
}
function evaluateResourceOptimization(resourceEnvelope, interventionComparison, resourceModels = {}) {
  const resource = normalizeResourceEnvelope(resourceEnvelope);
  if (resource.status !== 'VALID') return { status: 'NOT_ACTIVATED', resource, candidates: [], allocation: null, opportunityCost: null, feedback: resource.feedback };
  const candidates = interventionComparison.map(intervention => {
    const model = resourceModels[intervention.id]; const validation = validateModel(intervention, model, resource.unit);
    const lineageInvalid = !model?.evidenceIds || !Array.isArray(model.evidenceIds) || new Set(model.evidenceIds).size !== model.evidenceIds.length;
    if (lineageInvalid) { if (!validation.failures.includes('resource-chain-evidence-lineage-incomplete')) validation.failures.push('resource-chain-evidence-lineage-incomplete'); validation.admissible = false; }
    if (!validation.admissible || intervention.status !== 'ADMISSIBLE') return { id: intervention.id, name: intervention.name, status: 'BLOCKED', failures: validation.failures.length ? validation.failures : ['intervention-not-admissible'], effectPerCad: null };
    const capacity = resource.amount * Number(model.capacityPerCad), activity = capacity * Number(model.activityPerCapacity), expectedEffect = activity * Number(model.effectPerActivity);
    return { id: intervention.id, name: intervention.name, status: 'OPTIMIZABLE', failures: [], objectiveMetric: model.objectiveMetric, effectPerCad: Number(model.capacityPerCad) * Number(model.activityPerCapacity) * Number(model.effectPerActivity), translation: { marginalResource: { amount: resource.amount, unit: resource.unit }, capacity: { value: capacity, unit: model.capacityUnit || 'capacity_units' }, activity: { value: activity, unit: model.activityUnit || 'activity_units' }, outcome: { expectedIncrement: expectedEffect, unit: model.effectUnit || model.objectiveMetric || 'outcome_units' } }, evidenceIds: model.evidenceIds, uncertainty: model.uncertainty || null };
  });
  const incompatible = candidates.filter(x => x.status === 'BLOCKED' && x.failures.includes('resource-unit-incompatible'));
  if (incompatible.length) return { status: 'BLOCKED', resource, candidates, allocation: null, opportunityCost: null, feedback: `Resource optimization is blocked because candidate resource units are incompatible with the decision resource unit ${resource.unit}: ${incompatible.map(x => x.id).join(', ')}. Convert with an explicit governed rate or remove the candidate before optimization.` };
  const lineageBlocked = candidates.filter(x => x.status === 'BLOCKED' && x.failures.includes('resource-chain-evidence-lineage-incomplete'));
  if (lineageBlocked.length) return { status: 'BLOCKED', resource, candidates, allocation: null, opportunityCost: null, feedback: `Resource optimization is blocked because no admissible candidate has a complete evidenced marginal resource-to-outcome chain; candidate evidence lineage is incomplete or contains duplicate evidence identifiers: ${lineageBlocked.map(x => x.id).join(', ')}.` };
  const viable = candidates.filter(x => x.status === 'OPTIMIZABLE');
  if (!viable.length) return { status: 'BLOCKED', resource, candidates, allocation: null, opportunityCost: null, feedback: 'Resource amount is valid, but no admissible intervention has a complete evidenced marginal resource-to-outcome chain.' };
  const objectiveMetrics = [...new Set(viable.map(x => x.objectiveMetric))];
  if (objectiveMetrics.length > 1) return { status: 'BLOCKED', resource, candidates, allocation: null, opportunityCost: null, feedback: `Resource optimization is blocked because admissible interventions use incomparable objective metrics: ${objectiveMetrics.join(', ')}. Map each intervention to the same decision objective before comparing marginal outcomes.` };
  const ranked = viable.slice().sort((a,b) => b.effectPerCad - a.effectPerCad || a.id.localeCompare(b.id)); const winner = ranked[0], runnerUp = ranked[1] || null;
  return { status: 'OPTIMIZED', resource, objectiveMetric: objectiveMetrics[0], candidates, allocation: { intervention: winner.id, amount: resource.amount, unit: resource.unit, rationale: 'Highest evidenced expected incremental outcome per marginal resource unit among admissible optimizable interventions sharing the same decision objective.' }, opportunityCost: runnerUp ? { foregoneIntervention: runnerUp.id, foregoneExpectedIncrement: runnerUp.translation.outcome.expectedIncrement, selectedExpectedIncrement: winner.translation.outcome.expectedIncrement, difference: winner.translation.outcome.expectedIncrement - runnerUp.translation.outcome.expectedIncrement } : { foregoneIntervention: null, foregoneExpectedIncrement: 0, selectedExpectedIncrement: winner.translation.outcome.expectedIncrement, difference: winner.translation.outcome.expectedIncrement }, feedback: `Allocate ${resource.amount} ${resource.unit} to ${winner.name}: resource -> capacity -> activity -> expected outcome is evidenced and it has the highest marginal outcome per ${resource.unit} for objective ${objectiveMetrics[0]}.` };
}
module.exports = { normalizeResourceEnvelope, validateModel, evaluateResourceOptimization, compatibleResourceUnits };
