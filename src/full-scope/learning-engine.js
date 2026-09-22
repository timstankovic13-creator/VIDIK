'use strict';

const text = x => String(x ?? '').trim();
const finite = x => Number.isFinite(Number(x));
const nonEmptyArray = x => Array.isArray(x) && x.length > 0;
const canonicalUnit = x => text(x).toLowerCase() || null;

function comparableCityTransfer(raw = {}) {
  const reasons = [];
  const required = ['cityId', 'problem', 'interventionId'];
  for (const key of required) if (!text(raw[key])) reasons.push(`${key}-missing`);

  if (raw.evidenceVerified !== true) reasons.push('evidence-not-verified');
  if (raw.contextComparable !== true) reasons.push('context-not-comparable');
  const sourceIds = Array.isArray(raw.evidenceSourceIds)
    ? [...new Set(raw.evidenceSourceIds.map(text).filter(Boolean))]
    : [];
  if (!text(raw.evidenceSetId) && sourceIds.length === 0) reasons.push('transfer-provenance-missing');
  if (raw.effectsImported === true || raw.causalEffectImported === true || raw.localEffectApplied === true) {
    reasons.push(raw.localEffectApplied === true ? 'local-effect-not-transferable' : 'causal-effect-import-forbidden');
  }

  for (const key of ['effect', 'expectedEffect', 'observedEffect', 'parameter', 'causalEffect', 'effectEstimate', 'effectSize']) {
    if (raw[key] !== undefined && raw[key] !== null) reasons.push('numeric-effect-transfer-forbidden');
  }

  const eligible = reasons.length === 0;
  return {
    eligible,
    cityId: text(raw.cityId),
    problem: text(raw.problem),
    interventionId: text(raw.interventionId),
    evidenceSetId: text(raw.evidenceSetId) || null,
    evidenceSourceIds: sourceIds,
    provenanceComplete: Boolean(text(raw.evidenceSetId) || sourceIds.length),
    reasons: [...new Set(reasons)],
    role: eligible ? 'comparability-support' : 'learning-lead',
    mayInformDiscovery: true,
    maySupplyCausalEffect: false,
    mayAutoUpdateParameter: false
  };
}

function buildTransferSet(problem, records = []) {
  const rows = Array.isArray(records) ? records.map(comparableCityTransfer) : [];
  const target = text(problem);
  const relevant = rows.filter(r => !target || r.problem === target || r.problem.toLowerCase().includes(target.toLowerCase()) || target.toLowerCase().includes(r.problem.toLowerCase()));
  return {
    problem: target,
    candidateCount: rows.length,
    relevantCount: relevant.length,
    eligibleCount: relevant.filter(r => r.eligible).length,
    eligible: relevant.filter(r => r.eligible),
    leads: relevant.filter(r => !r.eligible),
    rule: 'Comparable-city evidence may prioritize investigation and discovery; it never becomes a local causal effect automatically.',
    parameterMutationAllowed: false,
    causalEffectImportAllowed: false
  };
}

function outcomeReview(expected = {}, observed = {}) {
  const expectedEffect = Number(expected.effect);
  const observedEffect = Number(observed.effect);
  if (!finite(expectedEffect) || !finite(observedEffect)) return { valid: false, reason: 'finite-expected-and-observed-effect-required', parameterMutationAllowed: false };
  const expectedUnit = canonicalUnit(expected.unit);
  const observedUnit = canonicalUnit(observed.unit);
  if (!expectedUnit || !observedUnit || expectedUnit !== observedUnit) return { valid: false, reason: 'effect-unit-mismatch-or-missing', parameterMutationAllowed: false };
  if (expectedEffect === 0) return { valid: false, reason: 'zero-expected-effect-cannot-define-relative-error', parameterMutationAllowed: false };
  const delta = observedEffect - expectedEffect;
  const relativeError = Math.abs(delta) / Math.abs(expectedEffect);
  return {
    valid: true,
    expectedEffect,
    observedEffect,
    effectUnit: expectedUnit,
    delta,
    relativeError,
    direction: delta === 0 ? 'on-target' : delta > 0 ? 'above-expectation' : 'below-expectation',
    parameterMutationAllowed: false,
    updateProposalRequired: relativeError > 0 ? 'human-review' : false
  };
}

function detectDrift(history = [], threshold = 0.2) {
  const parsedThreshold = Number(threshold);
  const t = finite(parsedThreshold) && parsedThreshold >= 0 && parsedThreshold <= 1 ? parsedThreshold : 0.2;
  const valid = Array.isArray(history) ? history.filter(h => h && finite(h.expectedEffect) && finite(h.observedEffect) && Number(h.expectedEffect) !== 0 && text(h.unit) && text(h.expectedUnit || h.unit) === text(h.unit)) : [];
  const deviations = valid.map(h => ({
    reviewId: text(h.reviewId),
    relativeError: Math.abs(Number(h.observedEffect) - Number(h.expectedEffect)) / Math.abs(Number(h.expectedEffect))
  }));
  const breached = deviations.filter(d => d.relativeError > t);
  return {
    reviewed: valid.length,
    ignoredInvalid: (Array.isArray(history) ? history.length : 0) - valid.length,
    threshold: t,
    driftDetected: breached.length > 0,
    breached,
    learningStatus: breached.length ? 'investigate-and-review' : 'stable',
    parameterMutationAllowed: false,
    automaticParameterUpdate: false
  };
}

function registerFailure(input = {}) {
  const severity = ['low', 'medium', 'high', 'critical'].includes(input.severity) ? input.severity : 'medium';
  const evidence = Array.isArray(input.evidence) ? [...input.evidence] : [];
  const remediation = Array.isArray(input.remediation) ? [...input.remediation] : [];
  const category = text(input.category) || 'unknown';
  const candidateId = text(input.candidateId) || 'unknown';
  return Object.freeze({
    id: text(input.id) || `failure:${category}:${candidateId}`,
    category,
    candidateId: text(input.candidateId) || null,
    severity,
    description: text(input.description),
    evidence,
    remediation,
    status: 'open',
    recommendationSuppressed: severity === 'critical' || severity === 'high',
    parameterMutationAllowed: false,
    autoResolutionAllowed: false,
    requiresHumanReview: severity === 'high' || severity === 'critical'
  });
}

module.exports = { comparableCityTransfer, buildTransferSet, outcomeReview, detectDrift, registerFailure };
