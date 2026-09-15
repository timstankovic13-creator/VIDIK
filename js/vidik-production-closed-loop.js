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

function buildDecisionScore({ candidates, verified, statusQuo }) {
  const quo = Number(statusQuo.expectedOutcome);
  const scores = {};
  for (const candidate of candidates) {
    const parameter = verified.parametersByCandidate[candidate.id];
    if (!parameter) continue;
    const expectedIncrement = Number(parameter.estimate);
    scores[candidate.id] = { outcome: quo + expectedIncrement, incrementalEffect: expectedIncrement, objectiveMetric: parameter.unit };
  }
  scores.STATUS_QUO = { outcome: quo, incrementalEffect: 0, objectiveMetric: statusQuo.objectiveMetric || 'status-quo-outcome' };
  return scores;
}

function selectOpportunityCost({ scores, selectedId }) {
  const alternatives = Object.entries(scores).filter(([id]) => id !== selectedId);
  const foregone = alternatives.sort((a, b) => b[1].outcome - a[1].outcome || a[0].localeCompare(b[0]))[0];
  return {
    selectedIntervention: selectedId,
    foregoneIntervention: foregone?.[0] || 'STATUS_QUO',
    foregoneExpectedOutcome: foregone?.[1]?.outcome ?? scores.STATUS_QUO.outcome,
    selectedExpectedOutcome: scores[selectedId]?.outcome ?? null,
    difference: scores[selectedId] ? scores[selectedId].outcome - (foregone?.[1]?.outcome ?? scores.STATUS_QUO.outcome) : null,
    alternativesConsidered: Object.keys(scores)
  };
}

function buildCanonicalAnalysis({ candidates, verified, baseline, scoreFn, decisionValue = 1, sensitivitySteps = 21, uncertaintySamples = 2000 }) {
  if (typeof scoreFn !== 'function') throw new Error('canonical-score-function-required');
  const candidateIds = candidates.filter(c => verified.parametersByCandidate[c.id]).map(c => c.id);
  const parameters = candidateIds.map(id => {
    const p = verified.parametersByCandidate[id];
    return { id: `${id}.effect`, low: Number(p.uncertainty.low), mean: Number(p.estimate), high: Number(p.uncertainty.high) };
  });
  const voiCandidates = candidateIds.map(id => {
    const p = verified.parametersByCandidate[id];
    return { id: `${id}.effect`, currentValue: Number(p.estimate), lowValue: Number(p.uncertainty.low), highValue: Number(p.uncertainty.high), pHigh: 0.5, cost: 0 };
  });
  const canonicalBaseline = { ...(baseline || {}), candidateIds };
  const analysis = DecisionIntelligence.analyze({ baseline: canonicalBaseline, parameters, correlations: [], scoreFn, candidates: voiCandidates, decisionValue, sensitivitySteps, uncertaintySamples });
  return { analysis, parameters, voiCandidates, decisionInputsHash: hash({ baseline: canonicalBaseline, parameters, correlations: [], voiCandidates, decisionValue }) };
}

function buildCompleteArtifact({ problem, objective, run, candidate, verifiedParameter, analysis, statusQuo, opportunityCost, discovery, evidence, optimizer, learning }) {
  const gates = {
    A_evidenceQuality: Boolean(evidence.complete),
    B_candidateParameter: Boolean(verifiedParameter),
    C_marginalResourceEffect: optimizer.status === 'OPTIMIZED' && Boolean(optimizer.allocation),
    D_uncertaintyVOIOptimization: Boolean(analysis?.integrityHash) && analysis.version === DecisionIntelligence.VERSION && Array.isArray(analysis.recommendationFlips) && Boolean(analysis.sensitivity?.hash) && Number(analysis.uncertainty?.sampleCount) >= 100 && Boolean(analysis.voi?.hash),
    E_decisionReadiness: statusQuo.explicit === true && opportunityCost.foregoneIntervention !== undefined
  };
  const eligible = Object.values(gates).every(Boolean);
  const promotedCandidate = candidate ? {
    id: candidate.id,
    name: candidate.name,
    discovery: { ...candidate.discovery, leadOnly: false, promotedFromLead: true, promotionSource: verifiedParameter?.sourceId || null, verificationId: verifiedParameter?.verificationId || null }
  } : null;
  const decision = { recommendation: candidate?.id || null, recommendationAllowed: eligible, status: eligible ? 'RECOMMENDATION_ELIGIBLE' : 'BLOCKED' };
  const artifact = Closure.buildDecisionArtifact({
    problem,
    run: { decision, runHash: hash({ problem, objective, discovery, evidence, optimizer, analysis }), governance: { candidateUniverseIntelligence: discovery }, learningDiscovery: learning },
    candidate: promotedCandidate,
    gate: { recommendationEligible: eligible, gates },
    analysis: { canonicalDecisionIntelligence: analysis, verifiedParameter: verifiedParameter || null, optimizer: { status: optimizer.status, allocation: optimizer.allocation } },
    statusQuo,
    whyWhyNot: { selected: candidate?.id || null, opportunityCost, alternatives: optimizer.candidates.map(c => c.id) },
    counterfactual: { status: eligible ? 'quantified' : 'blocked', baseline: statusQuo, candidateId: candidate?.id || null, estimatedIncrementalEffect: verifiedParameter ? Number(verifiedParameter.estimate) : null, effectUnit: verifiedParameter?.unit || null, resource: optimizer.allocation?.amount || null, resourceUnit: optimizer.allocation?.unit || null, unknownIsNotZero: !eligible, recommendationEligible: eligible, lineage: { discoveryHash: discovery.discoveryHash, evidenceHash: evidence.acquisitionHash, parameterHash: verifiedParameter ? hash(verifiedParameter) : null, analysisHash: analysis?.integrityHash || null, optimizerHash: hash(optimizer) } },
    evidence: { acquisition: evidence, discovery, verifiedParameter },
    override: { applied: false }
  });
  return { ...Closure.validateDecisionArtifact(artifact), artifact };
}

function buildLearningRecord({ artifact, observations }) {
  const valid = Array.isArray(observations) ? observations.filter(o => o && finite(o.predicted) && finite(o.observed)) : [];
  const comparisons = valid.map(o => ({ metric: o.metric || null, predicted: Number(o.predicted), observed: Number(o.observed), residual: Number(o.observed) - Number(o.predicted), sourceArtifactHash: artifact?.artifactHash || null }));
  return { schemaVersion: 'vidik.immutable-outcome-learning.v1', baselineArtifactHash: artifact?.artifactHash || null, comparisons, attributionRequired: true, historicalDecisionRewrite: false, parameterMutation: 'human-review-only', learningHash: hash(comparisons) };
}

async function executeProductionDecision(args = {}) {
  const statusQuo = makeStatusQuo(args.statusQuo);
  if (!statusQuo.explicit || statusQuo.status !== 'admissible-alternative') return { status: 'BLOCKED', reasons: ['status-quo-required-and-must-be-quantified'], statusQuo };
  const open = await ClosedLoop.runOpenWorldDecision({ ...args, statusQuo });
  if (!open.discovery.complete || !open.evidence.complete || !open.verified.complete) return { ...open, status: 'BLOCKED', reasons: [...open.certification.reasons] };
  const selectedId = open.optimizer.allocation?.intervention || null;
  if (!selectedId) return { ...open, status: 'BLOCKED', reasons: ['canonical-optimizer-produced-no-selection'] };
  let canonical;
  try { canonical = buildCanonicalAnalysis({ candidates: open.discovery.candidates, verified: open.verified, baseline: args.baseline, scoreFn: args.scoreFn, decisionValue: args.decisionValue || 1, sensitivitySteps: args.sensitivitySteps || 21, uncertaintySamples: args.uncertaintySamples || 2000 }); }
  catch (error) { return { ...open, status: 'BLOCKED', reasons: [`canonical-analysis-failed:${error.message}`] }; }
  const scores = buildDecisionScore({ candidates: open.discovery.candidates, verified: open.verified, statusQuo });
  const opportunityCost = selectOpportunityCost({ scores, selectedId });
  const selectedParameter = open.verified.parametersByCandidate[selectedId];
  const candidate = open.discovery.candidates.find(c => c.id === selectedId);
  const learningSeed = { baselineArtifactHash: null, historicalDecisionRewrite: false };
  const artifact = buildCompleteArtifact({ problem: args.problem, objective: args.objective, run: open, candidate, verifiedParameter: selectedParameter, analysis: canonical.analysis, statusQuo, opportunityCost, discovery: open.discovery, evidence: open.evidence, optimizer: open.optimizer, learning: learningSeed });
  const learning = buildLearningRecord({ artifact: artifact.artifact, observations: args.observations });
  const result = { ...open, analysis: canonical.analysis, decisionInputsHash: canonical.decisionInputsHash, status: artifact.valid ? 'RECOMMENDATION_ELIGIBLE' : 'BLOCKED', selectedId, scores, opportunityCost, artifact, learning, lineage: { discoveryHash: open.discovery.discoveryHash, evidenceHash: open.evidence.acquisitionHash, parameterHash: open.verified.parameterHash, decisionInputsHash: canonical.decisionInputsHash, optimizerHash: hash(open.optimizer), decisionIntelligenceHash: canonical.analysis.integrityHash, artifactHash: artifact.artifact?.artifactHash || null, learningHash: learning.learningHash } };
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
  if (!result.lineage?.decisionInputsHash || !result.lineage?.decisionIntelligenceHash) failures.push('decision-lineage-incomplete');
  return { passed: failures.length === 0, failures };
}

module.exports = { executeProductionDecision, buildCanonicalAnalysis, buildCompleteArtifact, buildLearningRecord, selectOpportunityCost, makeStatusQuo, assertBlindRun, hash };
