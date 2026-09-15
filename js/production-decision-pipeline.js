'use strict';

const crypto = require('node:crypto');
const Discovery = require('./intervention-discovery');
const SourceDiscovery = require('./source-driven-intervention-discovery');
const EvidenceDiscovery = require('./source-driven-evidence-discovery');
const Promotion = require('./evidence-promotion-gate');
const Orchestrator = require('./decision-discovery-orchestrator');
const ArtifactStore = require('./decision-artifact-store');

const stable = value => Array.isArray(value)
  ? `[${value.map(stable).join(',')}]`
  : (value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`
    : JSON.stringify(value));
const sha256 = value => crypto.createHash('sha256').update(stable(value)).digest('hex');

function promoteDiscoveryLeads({ discovery, verificationByEvidenceId = {}, targetJurisdiction, requiredEvidence } = {}) {
  const leads = Array.isArray(discovery?.evidenceLeads) ? discovery.evidenceLeads : [];
  const promotions = [];
  const blocked = [];
  for (const lead of leads) {
    const verification = verificationByEvidenceId[lead.id];
    const gate = Promotion.promoteVerifiedParameter({ lead, verification, targetJurisdiction, requiredEvidence });
    if (gate.eligible) promotions.push(gate.verifiedParameter);
    else blocked.push({ evidenceId: lead.id || null, candidateId: lead.candidateId || null, reasons: gate.reasons });
  }
  return {
    schemaVersion: 'vidik.discovery-evidence-promotion.v2',
    discoveryHash: discovery?.discoveryHash || null,
    leadCount: leads.length,
    promotedCount: promotions.length,
    blockedCount: blocked.length,
    promotions,
    blocked,
    recommendationEligible: false,
    effectsImported: false,
    promotionHash: sha256({ discoveryHash: discovery?.discoveryHash || null, promotions, blocked })
  };
}

function assessComparableCityTransfer(localContext = {}, comparableLeads = []) {
  const results = comparableLeads.map(lead => {
    const mismatches = [];
    for (const field of ['problem', 'population', 'institutionalCapacity', 'implementationEnvironment']) {
      if (localContext[field] && lead[field] && localContext[field] !== lead[field]) mismatches.push(field);
    }
    const sameJurisdiction = Boolean(localContext.jurisdiction && lead.jurisdiction && localContext.jurisdiction === lead.jurisdiction);
    return {
      city: lead.city || null,
      jurisdiction: lead.jurisdiction || null,
      intervention: lead.intervention || lead.name || null,
      matchedSignals: lead.matchedSignals || [],
      classification: mismatches.length ? 'requires-local-validation' : (sameJurisdiction ? 'locally-relevant' : 'transferable-with-local-validation'),
      mismatches,
      causalEffectTransferred: false,
      evidenceImported: false,
      provenance: lead.provenance || null
    };
  });
  return { schemaVersion: 'vidik.comparable-city-transfer.v1', localContext, results, causalEffectTransferred: false, evidenceImported: false };
}

function evaluateOperationalState({ sourceSearches = [], candidates = [], evidence = [], analysis = null, statusQuo = null } = {}) {
  const blockers = [];
  if (sourceSearches.some(s => ['failed', 'search-failed', 'error', 'blocked'].includes(s.status))) blockers.push('source-failed');
  if (sourceSearches.some(s => s.freshness?.status === 'stale' || s.status === 'stale')) blockers.push('source-stale');
  if (!candidates.length) blockers.push('no-candidates');
  if (candidates.some(c => c.evidenceState === 'evidence-gap')) blockers.push('evidence-insufficient');
  if (evidence.some(e => e.conflicting === true || e.status === 'conflicting')) blockers.push('evidence-conflicting');
  if (candidates.some(c => c.effectUnknown === true)) blockers.push('effect-unknown');
  if (analysis?.status === 'incomplete' || analysis?.status === 'blocked') blockers.push('quantification-incomplete');
  if (!(statusQuo?.explicit === true)) blockers.push('status-quo-not-explicit');
  return { schemaVersion: 'vidik.operational-gate.v2', safeToRecommend: blockers.length === 0, recommendationEligible: blockers.length === 0, blockers: [...new Set(blockers)], unknownIsNotZero: true, action: blockers.length ? 'BLOCK_OR_LIMIT_DECISION' : 'PROCEED_TO_OPTIMIZATION' };
}

function recordOutcomeReview({ decisionArtifact, checkpoint, predicted, observed } = {}) {
  if (!decisionArtifact?.integrity?.contentHash) throw new Error('decision-artifact-integrity-required');
  if (!Number.isFinite(Number(predicted)) || !Number.isFinite(Number(observed))) throw new Error('predicted-and-observed-required');
  return {
    schemaVersion: 'vidik.outcome-review.v2',
    decisionId: decisionArtifact.decisionId || null,
    baselineDecisionHash: decisionArtifact.integrity.contentHash,
    checkpoint: checkpoint || null,
    predicted: Number(predicted),
    observed: Number(observed),
    deviation: Number(observed) - Number(predicted),
    recordedAt: new Date().toISOString(),
    historyRewrite: false,
    automaticParameterMutation: false,
    recalibrationRequiresExplicitGovernance: true
  };
}

function buildProductionReadiness({ discoveryComplete = false, evidenceVerified = false, parametersAdmissible = false, optimizationValid = false, decisionArtifactPersisted = false, outcomeLearningReady = false, operationalGate = null } = {}) {
  const checks = {
    discovery: Boolean(discoveryComplete),
    evidence: Boolean(evidenceVerified),
    parameters: Boolean(parametersAdmissible),
    optimization: Boolean(optimizationValid),
    decisionArtifact: Boolean(decisionArtifactPersisted),
    outcomeLearning: Boolean(outcomeLearningReady)
  };
  const passed = Object.values(checks).filter(Boolean).length;
  return {
    schemaVersion: 'vidik.production-readiness.v2',
    passed,
    total: Object.keys(checks).length,
    complete: passed === Object.keys(checks).length && operationalGate?.safeToRecommend !== false,
    checks,
    operationalGate: operationalGate || null,
    releaseRecommendation: passed === Object.keys(checks).length && operationalGate?.safeToRecommend !== false ? 'eligible-for-human-decision' : 'blocked-or-limited'
  };
}

function assembleDecision({ run, promotion, transfer, operational, readiness, overrides = {} } = {}) {
  const artifact = Orchestrator.buildDecisionArtifact(run, {
    ...overrides,
    decision: {
      ...(run.decision || {}),
      enginePromotion: promotion,
      comparableCityTransfer: transfer,
      operationalGate: operational,
      readiness
    },
    governance: { ...(run.governance || {}), operationalGate: operational, productionReadiness: readiness },
    learning: { ...(run.learning || {}), appendOnly: true, automaticParameterMutation: false }
  });
  if (!ArtifactStore.verifyArtifact(artifact).ok) throw new Error('decision-artifact-integrity-failed');
  return artifact;
}

function runEngine({ problem, acquisitionSources = [], researchLeads = [], localCandidates = [], acquiredCandidates = [], comparableCities = [], evidenceIndex = {}, analysisInputs = {}, requiredSourceTypes, statusQuo, decisionContext = {}, verificationByEvidenceId = {} } = {}) {
  const run = Orchestrator.buildDiscoveryRun({ problem, acquisitionSources, researchLeads, localCandidates, acquiredCandidates, comparableCities, evidenceIndex, analysisInputs, requiredSourceTypes, statusQuo, decisionContext });
  const promotion = promoteDiscoveryLeads({ discovery: { evidenceLeads: run.candidates.flatMap(c => (c.evidence || []).filter(e => e.evidenceLeadOnly)), discoveryHash: run.runHash }, verificationByEvidenceId, targetJurisdiction: decisionContext.jurisdiction || null });
  const transfer = assessComparableCityTransfer(decisionContext, run.comparableCityLeads);
  const operational = evaluateOperationalState({ sourceSearches: run.sourceSearches, candidates: run.candidates, evidence: run.evidenceGaps.flatMap(g => g.evidence || []), analysis: run.analysis, statusQuo });
  const readiness = buildProductionReadiness({
    discoveryComplete: run.discoveryAudit?.discoverySearchComplete === true,
    evidenceVerified: promotion.promotedCount > 0,
    parametersAdmissible: promotion.promotedCount > 0,
    optimizationValid: run.analysis?.status === 'complete' && run.analysis?.recommendationFlip === false,
    decisionArtifactPersisted: false,
    outcomeLearningReady: true,
    operationalGate: operational
  });
  const artifact = assembleDecision({ run, promotion, transfer, operational, readiness });
  return { schemaVersion: 'vidik.production-decision.v1', run, promotion, transfer, operational, readiness, artifact, pipelineHash: sha256({ runHash: run.runHash, promotion, transfer, operational, readiness, artifactHash: artifact.integrity.contentHash }) };
}

async function discoverInterventionUniverse({ problem, jurisdiction, sources, fetchImpl, now = new Date(), rows = 25 } = {}) {
  return SourceDiscovery.discoverSourceDrivenInterventions({ problem, jurisdiction, sources, fetchImpl, now, rows });
}

async function discoverEvidenceForCandidate({ problem, candidate, fetchImpl, now = new Date() } = {}) {
  return EvidenceDiscovery.discoverCandidateEvidence({ problem, candidate, fetchImpl, now });
}

module.exports = {
  promoteDiscoveryLeads,
  assessComparableCityTransfer,
  evaluateOperationalState,
  recordOutcomeReview,
  buildProductionReadiness,
  assembleDecision,
  runEngine,
  discoverInterventionUniverse,
  discoverEvidenceForCandidate,
  sha256
};
