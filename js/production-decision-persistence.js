'use strict';

function requireEligibleResult(result) {
  if (!result || result.status !== 'RECOMMENDATION_ELIGIBLE') {
    throw new Error('only-eligible-decision-results-may-be-persisted');
  }
  if (!result.artifact?.artifact || !result.lineage?.artifactHash) {
    throw new Error('complete-decision-artifact-required');
  }
}

async function persistProductionDecision({ store, tenantId, decisionKey, result, tenantName }) {
  if (!store || typeof store.saveDecision !== 'function') throw new Error('decision-store-required');
  requireEligibleResult(result);
  const saved = await store.saveDecision({
    tenantId,
    decisionKey,
    tenantName,
    artifact: result.artifact.artifact,
  });
  return {
    status: 'PERSISTED',
    decisionId: saved.decision.id,
    decisionKey: saved.decision.decision_key,
    artifactHash: result.lineage.artifactHash,
    audit: saved.audit,
  };
}

async function persistOutcome({ store, tenantId, decisionId, observation }) {
  if (!store || typeof store.recordOutcome !== 'function') throw new Error('decision-store-required');
  if (!observation || !observation.parameterName || !observation.checkpoint) {
    throw new Error('outcome-identity-required');
  }
  return store.recordOutcome({
    tenantId,
    decisionId,
    parameterName: observation.parameterName,
    checkpoint: observation.checkpoint,
    predicted: observation.predicted,
    observed: observation.observed,
    decisionAt: observation.decisionAt,
    outcomeAt: observation.outcomeAt,
  });
}

module.exports = { persistProductionDecision, persistOutcome, requireEligibleResult };
