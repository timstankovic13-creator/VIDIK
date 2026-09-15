'use strict';

const { validateMarginalResourceEvidence } = require('./marginal-resource-evidence');
const { evaluateResourceOptimization } = require('./vidik-resource-optimization');

function finite(value) { return Number.isFinite(Number(value)); }
function positive(value) { return finite(value) && Number(value) > 0; }
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
  return {
    candidateId: candidateId || null,
    complete: missing.length === 0,
    missing: [...new Set(missing)],
    required: ['verified-causal-parameter', 'verified-marginal-resource', 'common-outcome-unit', 'explicit-uncertainty', 'transportability', 'provenance']
  };
}

function buildDecisionAnalysisInputs({ candidates = [], evidence = {}, marginalResources = {}, budget = null, statusQuo = { explicit: true, effect: 0 } } = {}) {
  const rows = [];
  const blocked = [];
  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const id = candidate?.id || candidate?.candidateId;
    const causal = evidence?.[id]?.causal || evidence?.[id] || null;
    const resource = marginalResources?.[id] || evidence?.[id]?.marginalResource || null;
    const requirements = quantitativeAcquisitionRequirements({ candidateId: id, causalEvidence: causal, marginalResourceEvidence: resource });
    if (!requirements.complete) {
      blocked.push({ candidateId: id || null, requirements });
      continue;
    }
    const sourceId = causal.sourceId || causal.provenance?.sourceId;
    rows.push({
      id: id || candidate?.name,
      name: candidate?.name || id,
      status: 'ADMISSIBLE',
      effect: Number(causal.estimate),
      resource: Number(resource.resourceAmount),
      effectUnit: causal.unit,
      resourceUnit: resource.resourceUnit,
      discoveryOnly: false,
      leadOnly: false,
      verified: true,
      evidenceIndependent: true,
      evidence: [{ sourceId, verified: true, verification: { status: 'verified' } }, ...(Array.isArray(resource.evidenceIds) ? resource.evidenceIds.map(evidenceId => ({ sourceId: evidenceId, verified: true, verification: { status: 'verified' } })) : [])],
      parameter: { effect: Number(causal.estimate), resource: Number(resource.resourceAmount), effectUnit: causal.unit, resourceUnit: resource.resourceUnit, verified: true, verification: { status: 'verified' } },
      uncertainty: { low: Number(causal.uncertainty.low), high: Number(causal.uncertainty.high) },
      marginalResourceEvidence: resource
    });
  }

  const optimization = evaluateResourceOptimization(
    { marginalUnit: budget == null ? null : { amount: budget.amount, unit: budget.unit } },
    rows.map(row => ({ id: row.id, name: row.name, status: 'ADMISSIBLE' })),
    Object.fromEntries(rows.map(row => [row.id, {
      capacityPerCad: 1,
      activityPerCapacity: 1,
      effectPerActivity: row.effect / row.resource,
      objectiveMetric: row.effectUnit,
      resourceUnit: row.resourceUnit,
      effectUnit: row.effectUnit,
      evidenceIds: [row.id, ...(row.marginalResourceEvidence.evidenceIds || [])]
    }]))
  );

  const selected = optimization.allocation?.intervention || null;
  const selectedRow = rows.find(row => row.id === selected) || null;
  const analysis = {};
  for (const row of rows) {
    const low = Number(row.uncertainty.low);
    const high = Number(row.uncertainty.high);
    const lowEfficiency = low / row.resource;
    const highEfficiency = high / row.resource;
    const selectedEfficiency = selectedRow ? selectedRow.effect / selectedRow.resource : null;
    const reversalCondition = selectedRow && row.id !== selectedRow.id && highEfficiency > selectedEfficiency
      ? `Higher-bound uncertainty can exceed the selected candidate's point efficiency (${selectedEfficiency}); obtain better evidence before treating the ranking as robust.`
      : null;
    analysis[row.id] = {
      parameter: { value: row.effect, unit: row.effectUnit, verified: true, uncertainty: row.uncertainty },
      marginal: { effect: row.effect, effectUnit: row.effectUnit, resource: row.resource, resourceUnit: row.resourceUnit },
      uncertainty: { low, high, lowEfficiency, highEfficiency, stable: true, validated: true },
      voi: { value: Math.max(0, highEfficiency - lowEfficiency), unit: `${row.effectUnit}/${row.resourceUnit}`, method: 'uncertainty-width-per-resource', decisionSensitive: Boolean(reversalCondition), interpretation: reversalCondition || 'No candidate-specific ranking reversal is identified from the stated interval against the selected point estimate.' },
      optimization: { validated: optimization.status === 'OPTIMIZED' || (optimization.status === 'NOT_ACTIVATED' && rows.length > 0), selectedCandidateId: selected, opportunityCost: optimization.opportunityCost || null },
      keyAssumption: reversalCondition || 'Verified causal estimate and marginal resource-to-outcome chain are admissible for the requested jurisdiction and share a common outcome unit.',
      reversalCondition
    };
  }

  return {
    status: rows.length && blocked.length === 0 ? 'QUANTITATIVE_READY' : (rows.length ? 'PARTIAL' : 'BLOCKED_MISSING_QUANTITATIVE_EVIDENCE'),
    candidates: rows,
    blocked,
    analysisInputs: analysis,
    optimization,
    statusQuo,
    acquisitionRequirements: blocked.map(item => item.requirements)
  };
}

module.exports = { validateCausalParameter, quantitativeAcquisitionRequirements, buildDecisionAnalysisInputs };
