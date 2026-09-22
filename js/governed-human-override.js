'use strict';
const crypto = require('crypto');

function hash(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }

function requestHumanOverride(decision, request, authority = {}) {
  if (!decision || !decision.decisionId) throw new Error('override-decision-identity-required');
  if (!request || !request.actorId) throw new Error('override-actor-required');
  if (!request.reason || String(request.reason).trim().length < 10) throw new Error('override-reason-required');
  if (!authority.canOverride) throw new Error('override-authority-required');
  const now = request.timestamp || new Date().toISOString();
  const snapshot = JSON.parse(JSON.stringify(decision));
  const record = {
    overrideId: `OVR-${hash({ decisionId: decision.decisionId, actorId: request.actorId, reason: request.reason, now }).slice(0, 16)}`,
    decisionId: decision.decisionId,
    actorId: request.actorId,
    authority: authority.role || null,
    reason: String(request.reason).trim(),
    fromRecommendation: decision.recommendation || null,
    toRecommendation: request.toRecommendation || null,
    timestamp: now,
    originalEvidenceHash: decision.audit?.evidenceHash || null,
    immutableDecisionSnapshotHash: hash(snapshot),
    status: 'APPLIED'
  };
  return {
    ...decision,
    recommendation: record.toRecommendation,
    recommendationName: request.toRecommendationName || decision.recommendationName || null,
    decisionState: record.toRecommendation ? 'RECOMMENDATION_OVERRIDDEN' : 'BLOCKED_OVERRIDDEN',
    governanceOverridesAudit: {
      ...(decision.governanceOverridesAudit || {}),
      humanOverride: record,
      overrideRequired: false,
      audit: { ...(decision.governanceOverridesAudit?.audit || decision.audit || {}), override: record }
    }
  };
}

module.exports = { requestHumanOverride };
