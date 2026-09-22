'use strict';

const { validateMarginalResourceEvidence } = require('./marginal-resource-evidence');
const { evaluateResourceOptimization } = require('./vidik-resource-optimization');
const { buildSensitivityAnalysis } = require('./decision-sensitivity');

function finite(value) { return Number.isFinite(Number(value)); }
function text(value) { return String(value ?? '').trim(); }

function validateCausalParameter(evidence) {
  const failures = [];
  if (!evidence || typeof evidence !== 'object') failures.push('causal-evidence-missing');
  if (evidence?.verified !== true) failures.push('causal-evidence-not-verified');
  if (evidence?.evidenceType !== 'causal') failures.push('causal-evidence-type-required');
  if (!finite(evidence?.estimate)) failures.push('causal-estimate-required');
  if (!text(evidence?.unit)) failures.push('causal-unit-required');
  if (!evidence?.uncertainty || !finite(evidence.uncertainty.low) || !finite(evidence.uncertainty.high) || Number(evidence.uncertainty.low) > Number(evidence.uncertainty.high)) failures.push('causal-uncertainty-required');
  if (evidence?.transportability?.admissible !== true) failures.push('causal-transportability-not-admissible');
  if (!evidence?.sourceId && !evidence?.provenance?.sourceId) failures.push('causal-provenance-source-required');
  return { valid: failures.length === 0, failures };
}

function quantitativeAcquisitionRequirements({ candidateId, causalEvidence = null, marginalResourceEvidence = null } = {}) {
  const missing = [];
  const causal = validateCausalParameter(causalEvidence);
  if (!causal.valid) missing.push(...causal.failures);
  const marginal = validateMarginalResourceEvidence(marginalResourceEvidence || {});
  if (!marginal.valid) missing.push(...marginal.failures);
  if (causalEvidence && marginalResourceEvidence && text(causalEvidence.unit) !== text(marginalResourceEvidence.unit)) missing.push('causal-marginal-outcome-unit-mismatch');
  if (causalEvidence && marginalResourceEvidence && finite(causalEvidence.estimate) && finite(marginalResourceEvidence.incrementalOutcome) && Number(causalEvidence.estimate) !== Number(marginalResourceEvidence.incrementalOutcome)) missing.push('causal-marginal-effect-link-not-equal');
  return { candidateId: candidateId || null, complete: missing.length === 0, missing: [...new Set(missing)], required: ['verified-causal-parameter', 'verified-marginal-resource', 'common-outcome-unit', 'explicit-uncertainty', 'transportability', 'provenance'] };
}

function buildResourceProductionModel(resource, effectUnit) {
  const resourceAmount = Number(resource.resourceAmount);
  const incrementalCapacity = Number(resource.incrementalCapacity);
  const incrementalActivity = Number(resource.incrementalActivity);
  const incrementalOutcome = Number(resource.incrementalOutcome);
  const evidenceIds = [...new Set([resource.evidenceId, ...(Array.isArray(resource.evidenceIds) ? resource.evidenceIds : [])].filter(Boolean))];
  return {
    capacityPerCad: incrementalCapacity / resourceAmount,
    activityPerCapacity: incrementalActivity / incrementalCapacity,
    effectPerActivity: incrementalOutcome / incrementalActivity,
    objectiveMetric: effectUnit,
    resourceUnit: resource.resourceUnit,
    effectUnit,
    capacityUnit: resource.capacityUnit || 'capacity_units',
    activityUnit: resource.activityUnit || 'activity_units',
    evidenceIds,
    uncertainty: resource.uncertainty || null
  };
}

function buildDecisionAnalysisInputs({ candidates = [], evidence = {}, marginalResources = {}, budget = null, voiValues = {}, statusQuo = { explicit: true, effect: 0 } } = {}) {
  const rows = [];
  const blocked = [];
  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const id = candidate?.id || candidate?.candidateId;
    const causal = evidence?.[id]?.causal || evidence?.[id] || null;
    const resource = marginalResources?.[id] || evidence?.[id]?.marginalResource || null;
    const requirements = quantitativeAcquisitionRequirements({ candidateId: id, causalEvidence: causal, marginalResourceEvidence: resource });
    if (!requirements.complete) { blocked.push({ candidateId: id || null, requirements }); continue; }
    const sourceId = causal.sourceId || causal.provenance?.sourceId;
    rows.push({
      id: id || candidate?.name, name: candidate?.name || id, status: 'ADMISSIBLE', effect: Number(causal.estimate), resource: Number(resource.resourceAmount),
      effectUnit: causal.unit, resourceUnit: resource.resourceUnit, discoveryOnly: false, leadOnly: false, verified: true,
      evidence: [{ sourceId, verified: true, verification: { status: 'verified' } }, ...(Array.isArray(resource.evidenceIds) ? resource.evidenceIds.map(evidenceId => ({ sourceId: evidenceId, verified: true, verification: { status: 'verified' } })) : [])],
      parameter: { effect: Number(causal.estimate), resource: Number(resource.resourceAmount), effectUnit: causal.unit, resourceUnit: resource.resourceUnit, verified: true, verification: { status: 'verified' } },
      uncertainty: { low: Number(causal.uncertainty.low), high: Number(causal.uncertainty.high) }, marginalResourceEvidence: resource
    });
  }

  const resourceUnit = rows[0]?.resourceUnit || budget?.unit || 'CAD';
  const decisionBudget = budget || (rows.length ? { amount: Math.max(...rows.map(row => row.resource)), unit: resourceUnit } : null);
  const optimization = decisionBudget ? evaluateResourceOptimization(
    { marginalUnit: { amount: decisionBudget.amount, unit: decisionBudget.unit } },
    rows.map(row => ({ id: row.id, name: row.name, status: 'ADMISSIBLE' })),
    Object.fromEntries(rows.map(row => [row.id, buildResourceProductionModel(row.marginalResourceEvidence, row.effectUnit)]))
  ) : { status: 'NOT_ACTIVATED', candidates: [] };

  const selected = optimization.allocation?.intervention || null;
  const selectedRow = rows.find(row => row.id === selected) || null;
  const analysis = {};
  for (const row of rows) {
    const low = Number(row.uncertainty.low), high = Number(row.uncertainty.high);
    const lowEfficiency = low / row.resource, highEfficiency = high / row.resource;
    const selectedEfficiency = selectedRow ? selectedRow.effect / selectedRow.resource : null;
    const reversalCondition = selectedRow && row.id !== selectedRow.id && highEfficiency > selectedEfficiency
      ? `Higher-bound uncertainty can exceed the selected candidate's point efficiency (${selectedEfficiency}); obtain better evidence before treating the ranking as robust.` : null;
    const explicitVoi = voiValues?.[row.id];
    const voiDefined = finite(explicitVoi);
    analysis[row.id] = {
      parameter: { value: row.effect, unit: row.effectUnit, verified: true, uncertainty: row.uncertainty },
      marginal: { effect: row.effect, effectUnit: row.effectUnit, resource: row.resource, resourceUnit: row.resourceUnit },
      uncertainty: { low, high, lowEfficiency, highEfficiency, stable: true, validated: true },
      voi: { value: voiDefined ? Number(explicitVoi) : null, defined: voiDefined, method: voiDefined ? 'externally-valued-decision-information' : null, decisionSensitive: Boolean(reversalCondition), interpretation: voiDefined ? 'Explicitly supplied value-of-information estimate; VIDIK does not invent a monetary value.' : 'VOI must be supplied or separately established before recommendation eligibility.' },
      optimization: { validated: optimization.status === 'OPTIMIZED', selectedCandidateId: selected, opportunityCost: optimization.opportunityCost || null },
      keyAssumption: reversalCondition || 'Verified causal estimate and marginal resource-to-outcome chain are admissible for the requested jurisdiction and share a common outcome unit.', reversalCondition
    };
  }

  const sensitivity = buildSensitivityAnalysis(rows);
  const quantitativeSubsetReady = rows.length > 0 && optimization.status === 'OPTIMIZED';
  const allAdmissibleHaveVoi = rows.length > 0 && rows.every(row => analysis[row.id].voi.defined);
  const recommendationReady = quantitativeSubsetReady && allAdmissibleHaveVoi && statusQuo?.explicit === true;
  const status = recommendationReady
    ? 'DECISION_QUANTITATIVE_READY'
    : quantitativeSubsetReady
      ? 'QUANTITATIVE_READY_VOI_OR_GATE_REQUIRED'
      : rows.length
        ? 'PARTIAL'
        : 'BLOCKED_MISSING_QUANTITATIVE_EVIDENCE';

  return {
    status,
    candidates: rows,
    blocked,
    analysisInputs: analysis,
    optimization,
    sensitivity,
    statusQuo,
    recommendationReady,
    evidenceCoverage: { admissible: rows.length, blocked: blocked.length, mixed: rows.length > 0 && blocked.length > 0 },
    acquisitionRequirements: blocked.map(item => item.requirements)
  };
}

module.exports = { validateCausalParameter, quantitativeAcquisitionRequirements, buildResourceProductionModel, buildDecisionAnalysisInputs };
