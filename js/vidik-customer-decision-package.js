'use strict';

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
}

function buildCustomerDecisionPackage(input = {}) {
  requireObject(input, 'input');
  const decision = input.decision || {};
  const reasoning = input.reasoning || {};
  const evidence = Array.isArray(input.evidence) ? input.evidence : [];
  const tradeoffs = Array.isArray(input.tradeoffs) ? input.tradeoffs : [];
  const uncertainty = input.uncertainty || {};
  const audit = input.audit || {};
  const status = decision.status || 'NO_RECOMMENDATION';
  const recommendation = status === 'RECOMMENDATION_READY' ? (decision.recommendation ?? null) : null;

  return Object.freeze({
    version: '1.0',
    decision: Object.freeze({
      id: decision.id ?? null,
      status,
      recommendation,
      objective: decision.objective ?? null,
      decisionDate: decision.decisionDate ?? null
    }),
    answer: recommendation === null
      ? 'NO RECOMMENDATION: the available evidence and decision gates do not support a defensible recommendation.'
      : String(decision.answer || `Recommendation: ${recommendation}`),
    reasoning: Object.freeze({
      why: reasoning.why ?? null,
      whyNot: reasoning.whyNot ?? null,
      model: reasoning.model ?? null,
      assumptions: Array.isArray(reasoning.assumptions) ? reasoning.assumptions.slice() : []
    }),
    evidence: Object.freeze(evidence.slice()),
    tradeoffs: Object.freeze(tradeoffs.slice()),
    uncertainty: Object.freeze({
      level: uncertainty.level ?? null,
      limitations: Array.isArray(uncertainty.limitations) ? uncertainty.limitations.slice() : [],
      sensitivity: uncertainty.sensitivity ?? null
    }),
    audit: Object.freeze({
      snapshotHash: audit.snapshotHash ?? null,
      override: audit.override ?? null,
      rationale: audit.rationale ?? null,
      history: Array.isArray(audit.history) ? audit.history.slice() : []
    })
  });
}

module.exports = { buildCustomerDecisionPackage };
