'use strict';

const REQUIRED = ['marginalExposure', 'counterfactual', 'attribution', 'transportability'];

function evaluateMarginalEvidence(candidate = {}) {
  const evidence = candidate.evidence || {};
  const missing = REQUIRED.filter(stage => !evidence[stage] || evidence[stage].status !== 'ADMISSIBLE');
  return Object.freeze({
    candidateId: candidate.candidateId || null,
    required: Object.freeze([...REQUIRED]),
    missing: Object.freeze(missing),
    status: missing.length === 0 ? 'PROMOTABLE_FOR_REVIEW' : 'BLOCKED',
    recommendationAllowed: missing.length === 0,
    reason: missing.length === 0
      ? 'All marginal causal gates are explicitly admissible.'
      : `Missing admissible marginal causal evidence: ${missing.join(', ')}`
  });
}

function buildEvidencePack(candidates = []) {
  if (!Array.isArray(candidates)) throw new TypeError('candidates must be an array');
  return Object.freeze(candidates.map(candidate => Object.freeze({
    candidateId: candidate.candidateId,
    historicalBoundary: '2023-12-06',
    historicalEvidence: Object.freeze({ ...(candidate.historicalEvidence || {}) }),
    currentLearningEvidence: Object.freeze({ ...(candidate.currentLearningEvidence || {}) }),
    gate: evaluateMarginalEvidence(candidate)
  })));
}

module.exports = { REQUIRED, evaluateMarginalEvidence, buildEvidencePack };
