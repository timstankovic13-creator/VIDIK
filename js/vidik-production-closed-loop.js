'use strict';

const crypto = require('node:crypto');
const ClosedLoop = require('./vidik-open-world-intelligence');
const Closure = require('./vidik-decision-artifact-closure');
const DecisionIntelligence = require('./decision-intelligence-9.7');

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
const hash = value => crypto.createHash('sha256').update(stable(value)).digest('hex');
const finite = value => Number.isFinite(Number(value));

function makeStatusQuo(statusQuo) {
  if (!statusQuo || statusQuo.explicit !== true) return { explicit: false, status: 'missing' };
  if (!finite(statusQuo.expectedOutcome)) return { ...statusQuo, status: 'invalid', explicit: true };
  return { ...statusQuo, status: 'admissible-alternative', explicit: true, expectedOutcome: Number(statusQuo.expectedOutcome) };
}

function buildDecisionScore({ candidates, verified, optimizer, statusQuo }) {
  const quo = Number(statusQuo.expectedOutcome);
  const scores = {};
  for (const candidate of candidates) {
    const parameter = verified.parametersByCandidate[candidate.id];
    if (!parameter) continue;
    const expectedIncrement = Number(parameter.estimate);
    scores[candidate.id] = { outcome: quo + expectedIncrement, incrementalEffect: expectedIncrement, resource: Number(optimizer.resource.amount), objectiveMetric: parameter.unit };
  }
  scores.STATUS_QUO = { outcome: quo, incrementalEffect: 0, resource: 0, objectiveMetric: statusQuo.objectiveMetric || 'status-quo-outcome' };
  return scores;
}

function selectOpportunityCost({ scores, selectedId }) {
  const alternatives = Object.entries(scores).filter(([id]) => id !== selectedId && id !== 'STATUS_QUO');
  const bestAlternative = alternatives.sort((a, b) => b[1].outcome - a[1].outcome || a[0].localeCompare(b[0]))[0];
  const quo = scores.STATUS_QUO;
  const candidates = bestAlternative ? [{ id: bestAlternative[0], expectedOutcome: bestAlternative[1].outcome }, { id: 'STATUS_QUO', expectedOutcome: quo.outcome }] : [{ id: 'STATUS_QUO', expectedOutcome: quo.outcome }];
  const foregone = candidates.sort((a, b) => b.expectedOutcome - a.expectedOutcome || a.id.localeCompare(b.id))[0];
  return { selectedIntervention: selectedId, foregoneIntervention: foregone.id, foregoneExpectedOutcome: foregone.expectedOutcome, selectedExpectedOutcome: scores[selectedId]?.outcome ?? null, difference: scores[selectedId] ? scores[selectedId].outcome - foregone.expectedOutcome : null, alternativesConsidered: Object.keys(scores) };
}

function buildCompleteArtifact({ problem, objective, run, candidate, verifiedParameter, analysis, statusQuo, opportunityCost, discovery, evidence, optimizer, learning }) {
  const gates = {
    A_evidenceQuality: Boolean(evidence.complete),
    B_candidateParameter: Boolean(verifiedParameter),
    C_marginalResourceEffect: optimizer.status === 'OPTIMIZED' && Boolean(optimizer.allocation),
    D_uncertaintyVOIOptimization: Boolean(analysis?.integrityHash) && analysis.version === DecisionIntelligence.VERSION && Array.isArray(analysis.recommendationFlips),
    E_decisionReadiness: statusQuo.explicit === true && opportunityCost.foregoneIntervention !== undefined
  };
  const promotedCandidate = candidate ? {
    id: candidate.id,
    name: candidate.name,
    discovery: {
      ...candidate.discovery,
      leadOnly: false,
      promotedFromLead: true,
      promotionSource: verifiedParameter?.sourceId || null,
      verificationId: verifiedParameter?.verificationId || null
    }
  } : null;
  const decision = {
    recommendation: candidate?.id || null,
    recommendationAllowed: Object.values(gates).every(Boolean),
    status: Object.values(gates).every(Boolean) ? 'RECOMMENDATION_ELIGIBLE' : 'BLOCKED'
  };
  const artifact = Closure.buildDecisionArtifact({
    problem,
    run: { decision, runHash: hash({ problem, objective, discovery, evidence, optimizer, analysis }) , governance: { candidateUniverseIntelligence: discovery }, learningDiscovery: learning },
    candidate: promotedCandidate,
    gate: { recommendationEligible: decision.recommendationAllowed, gates },
    analysis: { canonicalDecisionIntelligence: analysis, verifiedParameter: verifiedParameter || null, optimizer: { status: optimizer.status, allocation: optimizer.allocation } },
    statusQuo,
    whyWhyNot: { selected: candidate?.id || null, opportunityCost, alternatives: optimizer.candidates.map(c => c.id) },
    counterfactual: {
      status: decision.recommendationAllowed ? 'quantified' : 'blocked',
      baseline: statusQuo,
      candidateId: candidate?.id || null,
      estimatedIncrementalEffect: verifiedParameter ? Number(verifiedParameter.estimate) : null,
      effectUnit: verifiedParameter?.unit || null,
      resource: optimizer.allocation?.amount || null,
      resourceUnit: optimizer.allocation?.unit || null,
      unknownIsNotZero: !decision.recommendationAllowed,
      recommendationEligible: decision.recommendationAllowed,
      lineage: { discoveryHash: discovery.discoveryHash, evidenceHash: evidence.acquisitionHash, parameterHash: verifiedParameter ? hash(verifiedParameter) : null, analysisHash: analysis?.integrityHash || null, optimizerHash: hash(optimizer) }
    },
    evidence: { acquisition: evidence, discovery, verifiedParameter },
    override: { applied: false }
  });
  const validation = Closure.validateDecisionArtifact(artifact);
  return { ...validation, artifact };
}

function buildLearningRecord({ artifact, observations }) {
  const valid = Array.isArray(observations) ? observations.filter(o => o && finite(o.predicted) && finite(o.observed)) : [];
  const comparisons = valid.map(o => ({ metric: o.metric || null, predicted: Number(o.predicted), observed: Number(o.observed), residual: Number(o.observed) - Number(o.predicted), sourceArtifactHash: artifact?.artifactHash || null }));
  return { schemaVersion: 'vidik.immutable-outcome-learning.v1', baselineArtifactHash: artifact?.artifactHash || null, comparisons, attributionRequired: true, historicalDecisionRewrite: false, parameterMutation: 'human-review-only', learningHash: hash(comparisons) };
}

async function executeProductionDecision(args = {}) {
  const baseStatusQuo = makeStatusQuo(args.statusQuo);
  if (!baseStatusQuo.explicit || baseStatusQuo.status !== 'admissible-alternative') return { status: 'BLOCKED', reasons: ['status-quo-required-and-must-be-quantified'], statusQuo: baseStatusQuo };
  const open = await ClosedLoop.runOpenWorldDecision({ ...args, statusQuo: baseStatusQuo });
  if (!open.discovery.complete || !open.evidence.complete || !open.verified.complete) return { ...open, status: 'BLOCKED', reasons: [...open.certification.reasons] };
  const scores = buildDecisionScore({ candidates: open.discovery.candidates, verified: open.verified, optimizer: open.optimizer, statusQuo: baseStatusQuo });
  const selectedId = open.optimizer.allocation?.intervention || null;
  if (!selectedId) return { ...open, status: 'BLOCKED', reasons: ['canonical-optimizer-produced-no-selection'] };
  const opportunityCost = selectOpportunityCost({ scores, selectedId });
  const selectedParameter = open.verified.parametersByCandidate[selectedId];
  const candidate = open.discovery.candidates.find(c => c.id === selectedId);
  const artifact = buildCompleteArtifact({ problem: args.problem, objective: args.objective, run: open, candidate, verifiedParameter: selectedParameter, analysis: open.analysis, statusQuo: baseStatusQuo, opportunityCost, discovery: open.discovery, evidence: open.evidence, optimizer: open.optimizer, learning: open.learning });
  const learning = buildLearningRecord({ artifact: artifact.artifact, observations: args.observations });
  const result = { ...open, status: artifact.valid ? 'RECOMMENDATION_ELIGIBLE' : 'BLOCKED', selectedId, scores, opportunityCost, artifact, learning, lineage: { discoveryHash: open.discovery.discoveryHash, evidenceHash: open.evidence.acquisitionHash, parameterHash: open.verified.parameterHash, optimizerHash: hash(open.optimizer), decisionIntelligenceHash: open.analysis.integrityHash, artifactHash: artifact.artifact?.artifactHash || null, learningHash: learning.learningHash } };
  if (!artifact.valid) result.reasons = artifact.reasons;
  return result;
}

function assertBlindRun(result) {
  const failures = [];
  if (result.discovery?.openWorld !== true) failures.push('not-open-world');
  if (result.discovery?.candidateCount < 1) failures.push('no-discovered-candidates');
  if (!result.evidence?.complete) failures.push('evidence-not-tied-to-all-candidates');
  if (!result.verified?.complete) failures.push('verification-not-complete');
  if (result.status === 'RECOMMENDATION_ELIGIBLE' && !result.artifact?.valid) failures.push('eligible-with-invalid-artifact');
  if (result.status === 'RECOMMENDATION_ELIGIBLE' && result.discovery.candidates.some(c => c.id === result.selectedId && c.discovery?.leadOnly === true)) failures.push('lead-recommended');
  if (result.learning?.historicalDecisionRewrite !== false) failures.push('historical-rewrite');
  return { passed: failures.length === 0, failures };
}

module.exports = { executeProductionDecision, buildCompleteArtifact, buildLearningRecord, selectOpportunityCost, makeStatusQuo, assertBlindRun, hash };
