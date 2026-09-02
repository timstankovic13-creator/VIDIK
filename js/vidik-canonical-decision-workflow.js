'use strict';

const HISTORICAL_BOUNDARY = '2023-12-06';

function runDecisionWorkflow(input = {}) {
  const decisionDate = input.decisionDate || null;
  const historical = input.historical === true || (decisionDate && decisionDate <= HISTORICAL_BOUNDARY);
  const evidenceAdmissible = input.evidenceAdmissible === true;
  const modelReady = input.modelReady === true;
  const counterfactualReady = input.counterfactualReady === true;
  const recommendation = input.recommendation ?? null;

  // Historical decisions are immutable: later evidence can never manufacture a
  // recommendation for a decision that had already been made.
  if (historical) {
    return Object.freeze({
      status: 'NO_RECOMMENDATION',
      decisionId: input.decisionId || null,
      decisionDate,
      historical: true,
      historicalBoundary: HISTORICAL_BOUNDARY,
      recommendation: null,
      reason: 'Historical decision plane is frozen; later evidence is inadmissible for recommendation generation.'
    });
  }

  const eligible = evidenceAdmissible && modelReady && counterfactualReady && Boolean(recommendation);
  return Object.freeze({
    status: eligible ? 'RECOMMENDATION_READY' : 'NO_RECOMMENDATION',
    decisionId: input.decisionId || null,
    decisionDate,
    historical: false,
    historicalBoundary: HISTORICAL_BOUNDARY,
    recommendation: eligible ? recommendation : null,
    reason: eligible ? 'Evidence, model, counterfactual and recommendation inputs satisfy the canonical workflow gate.' : 'One or more canonical decision gates are incomplete.'
  });
}

module.exports = { HISTORICAL_BOUNDARY, runDecisionWorkflow };
