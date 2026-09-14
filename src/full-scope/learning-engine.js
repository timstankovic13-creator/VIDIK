'use strict';

const text = x => String(x ?? '').trim();
const finite = x => Number.isFinite(Number(x));

function comparableCityTransfer(raw = {}) {
  const reasons = [];
  const required = ['cityId','problem','interventionId'];
  for (const key of required) if (!text(raw[key])) reasons.push(`${key}-missing`);
  if (raw.evidenceVerified !== true) reasons.push('evidence-not-verified');
  if (raw.contextComparable !== true) reasons.push('context-not-comparable');
  if (raw.effectsImported === true || raw.causalEffectImported === true) reasons.push('causal-effect-import-forbidden');
  if (raw.localEffectApplied === true) reasons.push('local-effect-not-transferable');
  const eligible = reasons.length === 0;
  return {
    eligible,
    cityId: text(raw.cityId),
    problem: text(raw.problem),
    interventionId: text(raw.interventionId),
    reasons,
    role: eligible ? 'comparability-support' : 'learning-lead',
    mayInformDiscovery: true,
    maySupplyCausalEffect: false,
    mayAutoUpdateParameter: false
  };
}

function buildTransferSet(problem, records = []) {
  const rows = records.map(comparableCityTransfer);
  return {
    problem: text(problem),
    candidateCount: rows.length,
    eligibleCount: rows.filter(r => r.eligible).length,
    eligible: rows.filter(r => r.eligible),
    leads: rows.filter(r => !r.eligible),
    rule: 'Comparable-city evidence may prioritize investigation and discovery; it never becomes a local causal effect automatically.'
  };
}

function outcomeReview(expected = {}, observed = {}) {
  const expectedEffect = Number(expected.effect);
  const observedEffect = Number(observed.effect);
  if (!finite(expectedEffect) || !finite(observedEffect)) return { valid:false, reason:'finite-expected-and-observed-effect-required' };
  const delta = observedEffect - expectedEffect;
  const denominator = Math.max(Math.abs(expectedEffect), 1e-12);
  const relativeError = Math.abs(delta) / denominator;
  return {
    valid:true,
    expectedEffect,
    observedEffect,
    delta,
    relativeError,
    direction: delta === 0 ? 'on-target' : delta > 0 ? 'above-expectation' : 'below-expectation',
    parameterMutationAllowed:false
  };
}

function detectDrift(history = [], threshold = 0.2) {
  const t = Math.max(0, Number(threshold));
  const valid = history.filter(h => h && finite(h.expectedEffect) && finite(h.observedEffect));
  const deviations = valid.map(h => ({
    reviewId: text(h.reviewId),
    relativeError: Math.abs(Number(h.observedEffect) - Number(h.expectedEffect)) / Math.max(Math.abs(Number(h.expectedEffect)), 1e-12)
  }));
  const breached = deviations.filter(d => d.relativeError > t);
  return { reviewed: valid.length, threshold:t, driftDetected: breached.length > 0, breached, learningStatus: breached.length ? 'investigate-and-review' : 'stable', parameterMutationAllowed:false };
}

function registerFailure(input = {}) {
  const severity = ['low','medium','high','critical'].includes(input.severity) ? input.severity : 'medium';
  return {
    id: text(input.id) || `failure:${text(input.category) || 'unknown'}:${text(input.candidateId) || 'unknown'}`,
    category: text(input.category) || 'unknown',
    candidateId: text(input.candidateId) || null,
    severity,
    description: text(input.description),
    evidence: Array.isArray(input.evidence) ? input.evidence : [],
    remediation: Array.isArray(input.remediation) ? input.remediation : [],
    status: 'open',
    recommendationSuppressed: severity === 'critical' || severity === 'high'
  };
}

module.exports = { comparableCityTransfer, buildTransferSet, outcomeReview, detectDrift, registerFailure };
