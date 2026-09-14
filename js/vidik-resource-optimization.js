'use strict';

const Hardening = require('./vidik-trustworthiness-hardening');

function finitePositive(value, code) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error(code);
  return n;
}

function normalizeResourceEnvelope(resourceEnvelope) {
  const amount = resourceEnvelope?.marginalUnit?.amount;
  if (amount == null) return { status: 'NOT_SPECIFIED', amount: null, unit: 'CAD', feedback: 'Provide a positive marginal resource amount to activate resource translation.' };
  return { status: 'VALID', amount: finitePositive(amount, 'marginal-resource-amount-must-be-positive-finite'), unit: resourceEnvelope.marginalUnit.unit || 'CAD' };
}

function validateModel(intervention, model, context = {}) {
  if (!model) return { admissible: false, failures: ['marginal-resource-model-missing'] };
  const failures = [];
  const resourceUnit = context.resourceUnit || 'CAD';
  const modelForHardening = {
    ...model,
    capacityPerResource: model.capacityPerResource ?? model.capacityPerCad,
    resourceUnit: model.resourceUnit || model.currencyUnit || (model.capacityPerCad != null ? 'CAD' : null)
  };
  const chain = Hardening.validateMarginalChain(modelForHardening, {
    resourceUnit,
    evidenceIndex: context.evidenceIndex || {},
    jurisdiction: context.jurisdiction || null,
    now: context.now,
    maxAgeDays: context.maxAgeDays == null ? 365 : context.maxAgeDays
  });
  failures.push(...chain.failures);
  return { admissible: failures.length === 0, failures, evidence: chain.evidence, compatibility: chain.compatibility };
}

function evaluateResourceOptimization(resourceEnvelope, interventionComparison, resourceModels = {}, context = {}) {
  const resource = normalizeResourceEnvelope(resourceEnvelope);
  if (resource.status !== 'VALID') return { status: 'NOT_ACTIVATED', resource, candidates: [], allocation: null, opportunityCost: null, feedback: resource.feedback };

  const candidates = interventionComparison.map(intervention => {
    const model = resourceModels[intervention.id];
    const validation = validateModel(intervention, model, { ...context, resourceUnit: resource.unit });
    if (!validation.admissible || intervention.status !== 'ADMISSIBLE') return { id: intervention.id, name: intervention.name, status: 'BLOCKED', failures: validation.failures.length ? validation.failures : ['intervention-not-admissible'], effectPerCad: null };
    const capacityPerResource = Number(model.capacityPerResource ?? model.capacityPerCad);
    const capacity = resource.amount * capacityPerResource;
    const activity = capacity * Number(model.activityPerCapacity);
    const expectedEffect = activity * Number(model.effectPerActivity);
    return { id: intervention.id, name: intervention.name, status: 'OPTIMIZABLE', failures: [], objectiveMetric: model.objectiveMetric, effectPerCad: capacityPerResource * Number(model.activityPerCapacity) * Number(model.effectPerActivity), translation: { marginalResource: { amount: resource.amount, unit: resource.unit }, capacity: { value: capacity, unit: model.capacityUnit || 'capacity_units' }, activity: { value: activity, unit: model.activityUnit || 'activity_units' }, outcome: { expectedIncrement: expectedEffect, unit: model.effectUnit || model.objectiveMetric || 'outcome_units' } }, evidenceIds: model.evidenceIds, uncertainty: model.uncertainty || null };
  });
  const viable = candidates.filter(x => x.status === 'OPTIMIZABLE');
  if (!viable.length) return { status: 'BLOCKED', resource, candidates, allocation: null, opportunityCost: null, feedback: 'Resource amount is valid, but no admissible intervention has a complete evidenced marginal resource-to-outcome chain.' };

  const objectiveMetrics = [...new Set(viable.map(x => x.objectiveMetric))];
  if (objectiveMetrics.length > 1) return { status: 'BLOCKED', resource, candidates, allocation: null, opportunityCost: null, feedback: `Resource optimization is blocked because admissible interventions use incomparable objective metrics: ${objectiveMetrics.join(', ')}. Map each intervention to the same decision objective before comparing marginal outcomes.` };

  const ranked = viable.slice().sort((a,b) => b.effectPerCad - a.effectPerCad || a.id.localeCompare(b.id));
  const winner = ranked[0];
  const runnerUp = ranked[1] || null;
  return { status: 'OPTIMIZED', resource, objectiveMetric: objectiveMetrics[0], candidates, allocation: { intervention: winner.id, amount: resource.amount, unit: resource.unit, rationale: `Highest evidenced expected incremental outcome per marginal ${resource.unit} among admissible optimizable interventions sharing the same decision objective.` }, opportunityCost: runnerUp ? { foregoneIntervention: runnerUp.id, foregoneExpectedIncrement: runnerUp.translation.outcome.expectedIncrement, selectedExpectedIncrement: winner.translation.outcome.expectedIncrement, difference: winner.translation.outcome.expectedIncrement - runnerUp.translation.outcome.expectedIncrement } : { foregoneIntervention: null, foregoneExpectedIncrement: 0, selectedExpectedIncrement: winner.translation.outcome.expectedIncrement, difference: winner.translation.outcome.expectedIncrement }, feedback: `Allocate ${resource.amount} ${resource.unit} to ${winner.name}: resource -> capacity -> activity -> expected outcome is evidenced and it has the highest marginal outcome per ${resource.unit} for objective ${objectiveMetrics[0]}.` };
}

module.exports = { normalizeResourceEnvelope, validateModel, evaluateResourceOptimization };
