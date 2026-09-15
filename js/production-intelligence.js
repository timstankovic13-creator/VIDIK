'use strict';

/*
 * Production bridge for the final internal engine pass.
 * It deliberately composes existing gates instead of creating a second optimizer.
 * Browser builds expose VIDIK_PRODUCTION_INTELLIGENCE; Node can require this module.
 */
const crypto = typeof require === 'function' ? require('./data-acquisition').sha256 : null;
const promotionGate = typeof require === 'function' ? require('./evidence-promotion-gate') : null;

function hash(value) {
  if (crypto) return crypto(value);
  const text = JSON.stringify(value, Object.keys(value || {}).sort());
  let h = 2166136261;
  for (const c of text) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return ('00000000' + (h >>> 0).toString(16)).slice(-8);
}

function promoteEvidence(args = {}) {
  if (promotionGate) return promotionGate.promoteVerifiedParameter(args);
  const lead = args.lead;
  const verification = args.verification;
  const reasons = [];
  if (!lead?.evidenceLeadOnly) reasons.push('not-an-evidence-lead');
  if (lead?.causalEffectImported) reasons.push('effect-already-imported');
  if (!verification) reasons.push('independent-verification-missing');
  if (verification?.verified !== true) reasons.push('independent-verification-not-confirmed');
  if (verification && (verification.sourceId !== lead?.sourceId || verification.externalId !== lead?.provenance?.externalId)) reasons.push('verification-source-mismatch');
  if (verification?.evidenceType !== 'causal') reasons.push('causal-evidence-not-established');
  if (verification?.transportability?.admissible !== true) reasons.push('transportability-not-admissible');
  if (verification?.localEvidenceBoundary !== 'explicit') reasons.push('local-evidence-boundary-not-explicit');
  const p = verification?.parameter;
  if (!Number.isFinite(p?.estimate)) reasons.push('parameter-estimate-missing');
  if (!String(p?.unit || '').trim()) reasons.push('parameter-unit-missing');
  if (!Number.isFinite(p?.uncertainty?.low) || !Number.isFinite(p?.uncertainty?.high) || p.uncertainty.low > p.uncertainty.high) reasons.push('parameter-uncertainty-missing-or-invalid');
  const eligible = reasons.length === 0;
  return { schemaVersion:'vidik.evidence-promotion-gate.v1', eligible, recommendationEligible:false, reasons, evidenceLeadOnly:!eligible, effectsImported:false, verifiedParameter:eligible ? { candidateId:lead.candidateId, sourceId:lead.sourceId, externalId:lead.provenance.externalId, parameter:p, targetJurisdiction:verification.targetJurisdiction } : null, gateHash:hash({lead,verification,eligible,reasons}) };
}

function assessTransferability(local = {}, comparator = {}) {
  const mismatches = [];
  for (const field of ['problem','population','institutionalCapacity','implementationEnvironment']) {
    if (local[field] && comparator[field] && local[field] !== comparator[field]) mismatches.push(field);
  }
  const sameJurisdiction = local.jurisdiction && comparator.jurisdiction && local.jurisdiction === comparator.jurisdiction;
  const evidencePresent = Boolean(comparator.evidenceBase);
  const admissible = mismatches.length === 0 && evidencePresent;
  return { classification: admissible ? (sameJurisdiction ? 'locally-relevant' : 'transferable-with-local-validation') : 'requires-local-validation', mismatches, causalEffectTransferred:false, evidenceImported:false, evidenceBase:evidencePresent ? comparator.evidenceBase : null };
}

function buildDecisionArtifact(input = {}) {
  const artifact = {
    schema:'VIDIK.DecisionArtifact.v1',
    decisionId:input.decisionId || null,
    problem:input.problem || null,
    jurisdiction:input.jurisdiction || null,
    statusQuo:input.statusQuo || { explicit:true },
    discovery:input.discovery || null,
    candidates:input.candidates || [],
    evidence:input.evidence || [],
    parameters:input.parameters || [],
    uncertainty:input.uncertainty || null,
    optimization:input.optimization || null,
    recommendation:input.recommendation || null,
    why:input.why || null,
    whyNot:input.whyNot || null,
    alternatives:input.alternatives || [],
    humanOverride:input.humanOverride || null,
    outcomeReviews:input.outcomeReviews || [],
    createdAt:input.createdAt || new Date().toISOString()
  };
  artifact.immutableHash = hash(artifact);
  return artifact;
}

function recordOutcome(decision, outcome = {}) {
  const predicted = Number(outcome.predicted);
  const observed = Number(outcome.observed);
  if (!Number.isFinite(predicted) || !Number.isFinite(observed)) throw new Error('predicted-and-observed-required');
  return { schema:'VIDIK.OutcomeReview.v1', decisionId:decision?.decisionId || null, baselineDecisionHash:decision?.immutableHash || decision?.baselineHash || null, checkpoint:outcome.checkpoint || null, predicted, observed, deviation:observed-predicted, recordedAt:outcome.observedAt || new Date().toISOString(), historyRewrite:false, automaticParameterMutation:false };
}

function assessOperationalFailure(state = {}) {
  const blockers = [];
  if (state.sourceFailed) blockers.push('source-failed');
  if (state.sourceStale) blockers.push('source-stale');
  if (state.evidenceInsufficient) blockers.push('evidence-insufficient');
  if (state.evidenceConflicting) blockers.push('evidence-conflicting');
  if (state.effectUnknown) blockers.push('effect-unknown');
  if (state.uncertaintyInvalid) blockers.push('uncertainty-invalid');
  return { safeToRecommend:blockers.length===0, action:blockers.length ? 'BLOCK_OR_LIMIT_DECISION' : 'PROCEED_TO_OPTIMIZATION', blockers, unknownIsNotZero:true, recommendationEligible:blockers.length===0 };
}

function buildReadiness(input = {}) {
  const checks = [
    ['discovery', Boolean(input.discoveryComplete)],
    ['evidence', Boolean(input.evidenceVerified)],
    ['parameters', Boolean(input.parametersAdmissible)],
    ['optimization', Boolean(input.optimizationValid)],
    ['decisionArtifact', Boolean(input.decisionArtifactPersisted)],
    ['outcomeLearning', Boolean(input.outcomeLearningReady)]
  ];
  const passed = checks.filter(([,ok])=>ok).length;
  return { schema:'VIDIK.ProductionReadiness.v1', passed, total:checks.length, complete:passed===checks.length, checks:Object.fromEntries(checks) };
}

const API={hash,promoteEvidence,assessTransferability,buildDecisionArtifact,recordOutcome,assessOperationalFailure,buildReadiness};
if (typeof module !== 'undefined' && module.exports) module.exports=API;
if (typeof window !== 'undefined') window.VIDIK_PRODUCTION_INTELLIGENCE=API;
