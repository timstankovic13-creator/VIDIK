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
    const promotion = verified.parametersByCandidate[candidate.id];
    const parameter = promotion?.parameter;
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
  return { selectedIntervention: selectedId, foregoneIntervention: foregone?.[0] || 'STATUS_QUO', foregoneExpectedOutcome: foregone?.[1]?.outcome ?? scores.STATUS_QUO.outcome, selectedExpectedOutcome: scores[selectedId]?.outcome ?? null, difference: scores[selectedId] ? scores[selectedId].outcome - (foregone?.[1]?.outcome ?? scores.STATUS_QUO.outcome) : null, alternativesConsidered: Object.keys(scores) };
}

function buildCanonicalAnalysis({ candidates, verified, baseline, scoreFn, decisionValue = 1, sensitivitySteps = 21, uncertaintySamples = 2000 }) {
  if (typeof scoreFn !== 'function') throw new Error('canonical-score-function-required');
  const candidateIds = candidates.filter(c => verified.parametersByCandidate[c.id]?.parameter).map(c => c.id);
  const parameters = candidateIds.map(id => {
    const p = verified.parametersByCandidate[id].parameter;
    return { id: `${id}.effect`, low: Number(p.uncertainty.low), mean: Number(p.estimate), high: Number(p.uncertainty.high) };
  });
  const voiCandidates = candidateIds.map(id => {
    const p = verified.parametersByCandidate[id].parameter;
    return { id: `${id}.effect`, currentValue: Number(p.estimate), lowValue: Number(p.uncertainty.low), highValue: Number(p.uncertainty.high), pHigh: 0.5, cost: 0 };
  });
  const canonicalBaseline = { ...(baseline || {}), candidateIds };
  const analysis = DecisionIntelligence.analyze({ baseline: canonicalBaseline, parameters, correlations: [], scoreFn, candidates: voiCandidates, decisionValue, sensitivitySteps, uncertaintySamples });
  return { analysis, parameters, voiCandidates, decisionInputsHash: hash({ baseline: canonicalBaseline, parameters, correlations: [], voiCandidates, decisionValue }) };
}

function buildCompleteArtifact({ problem, objective, candidate, verifiedParameter, analysis, statusQuo, opportunityCost, discovery, evidence, optimizer }) {
  const gates = {
    A_evidenceQuality: evidence.complete === true,
    B_candidateParameter: Boolean(verifiedParameter?.parameter),
    C_marginalResourceEffect: optimizer.status === 'OPTIMIZED' && Boolean(optimizer.allocation),
    D_uncertaintyVOIOptimization: Boolean(analysis?.integrityHash) && analysis.version === DecisionIntelligence.VERSION && Array.isArray(analysis.recommendationFlips) && Boolean(analysis.sensitivity?.hash) && Number(analysis.uncertainty?.sampleCount) >= 100 && Boolean(analysis.voi?.hash),
    E_decisionReadiness: statusQuo.explicit === true && opportunityCost.foregoneIntervention !== undefined
  };
  const eligible = Object.values(gates).every(Boolean);
  const promotedCandidate = candidate ? { id: candidate.id, name: candidate.name, discovery: { ...candidate.discovery, leadOnly: false, promotedFromLead: true, promotionSource: verifiedParameter?.sourceId || null, verificationId: verifiedParameter?.verificationId || null } } : null;
  const decision = { recommendation: eligible ? candidate?.id || null : null, recommendationAllowed: eligible, status: eligible ? 'RECOMMENDATION_ELIGIBLE' : 'BLOCKED' };
  const counterfactual = { status: eligible ? 'quantified' : 'blocked', baseline: statusQuo, candidateId: candidate?.id || null, estimatedIncrementalEffect: eligible ? Number(verifiedParameter.parameter.estimate) : null, effectUnit: verifiedParameter?.parameter?.unit || null, resource: eligible ? Number(optimizer.allocation.amount) : null, resourceUnit: eligible ? optimizer.allocation.unit : null, unknownIsNotZero: !eligible, recommendationEligible: eligible, lineage: { discoveryHash: discovery.discoveryHash, evidenceHash: evidence.acquisitionHash, parameterHash: hash(verifiedParameter), analysisHash: analysis.integrityHash, optimizerHash: hash(optimizer) } };
  const artifact = Closure.buildDecisionArtifact({
    problem,
    run: { decision, runHash: hash({ problem, objective, discovery, evidence, optimizer, analysis }), governance: { candidateUniverseIntelligence: discovery }, learningDiscovery: { learningHash: hash({ discovery, evidence }) } },
    candidate: promotedCandidate,
    gate: { recommendationEligible: eligible, gates },
    analysis: { canonicalDecisionIntelligence: analysis, verifiedParameter, optimizer: { status: optimizer.status, allocation: optimizer.allocation } },
    statusQuo,
    whyWhyNot: { selected: eligible ? candidate?.id || null : null, opportunityCost, alternatives: optimizer.candidates.map(c => c.id) },
    counterfactual,
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
  const discovery = await ClosedLoop.discoverOpenWorldInterventions({ problem: args.problem, discoverySources: args.discoverySources || [], fallbackRegistry: args.fallbackRegistry || [] });
  if (!discovery.complete) return { status: 'BLOCKED', reasons: [discovery.failureState || 'open-world-discovery-incomplete'], discovery };
  const evidence = await ClosedLoop.acquireEvidenceForCandidates({ candidates: discovery.candidates, evidenceSources: args.evidenceSources || [], targetJurisdiction: args.targetJurisdiction });
  if (!evidence.complete) return { status: 'BLOCKED', reasons: ['candidate-evidence-acquisition-incomplete'], discovery, evidence };
  const verified = ClosedLoop.buildVerifiedParameters({ candidates: discovery.candidates, evidenceLeads: evidence.evidenceLeads, verifications: args.verifications || {}, targetJurisdiction: args.targetJurisdiction });
  if (!verified.complete) return { status: 'BLOCKED', reasons: ['independent-verification-incomplete'], discovery, evidence, verified };
  const resourceEnvelope = args.resourceEnvelope;
  if (!resourceEnvelope?.marginalUnit) return { status: 'BLOCKED', reasons: ['marginal-resource-envelope-missing'], discovery, evidence, verified };
  const optimizerComparison = discovery.candidates.map(c => ({ id: c.id, name: c.name, status: 'ADMISSIBLE' }));
  const optimizerModels = {};
  for (const candidate of discovery.candidates) {
    const promotion = verified.parametersByCandidate[candidate.id];
    const p = promotion?.parameter;
    if (!p) continue;
    optimizerModels[candidate.id] = { resourceUnit: resourceEnvelope.marginalUnit.unit, capacityPerCad: 1, activityPerCapacity: 1, effectPerActivity: Number(p.estimate), objectiveMetric: args.objectiveMetric || p.unit, capacityUnit: 'resource-units', activityUnit: 'activity-units', effectUnit: p.unit, uncertainty: { low: Number(p.uncertainty.low), high: Number(p.uncertainty.high) }, evidenceIds: [promotion.sourceId, promotion.externalId, promotion.verificationId] };
  }
  const optimizer = ResourceOptimization.evaluateResourceOptimization(resourceEnvelope, optimizerComparison, optimizerModels);
  if (optimizer.status !== 'OPTIMIZED') return { status: 'BLOCKED', reasons: ['canonical-optimizer-blocked', optimizer.feedback], discovery, evidence, verified, optimizer };
  let canonical;
  try { canonical = buildCanonicalAnalysis({ candidates: discovery.candidates, verified, baseline: args.baseline, scoreFn: args.scoreFn, decisionValue: args.decisionValue || 1, sensitivitySteps: args.sensitivitySteps || 21, uncertaintySamples: args.uncertaintySamples || 2000 }); }
  catch (error) { return { status: 'BLOCKED', reasons: [`canonical-analysis-failed:${error.message}`], discovery, evidence, verified, optimizer }; }
  const selectedId = optimizer.allocation.intervention;
  const selectedParameter = verified.parametersByCandidate[selectedId];
  const candidate = discovery.candidates.find(c => c.id === selectedId);
  const scores = buildDecisionScore({ candidates: discovery.candidates, verified, statusQuo });
  const opportunityCost = selectOpportunityCost({ scores, selectedId });
  const artifact = buildCompleteArtifact({ problem: args.problem, objective: args.objective, candidate, verifiedParameter: selectedParameter, analysis: canonical.analysis, statusQuo, opportunityCost, discovery, evidence, optimizer });
  const learning = buildLearningRecord({ artifact: artifact.artifact, observations: args.observations });
  const result = { schemaVersion: 'vidik.production-closed-loop.v1', objective: args.objective, problem: args.problem, status: artifact.valid ? 'RECOMMENDATION_ELIGIBLE' : 'BLOCKED', selectedId, discovery, evidence, verified, optimizer, analysis: canonical.analysis, decisionInputsHash: canonical.decisionInputsHash, scores, opportunityCost, artifact, learning, lineage: { discoveryHash: discovery.discoveryHash, evidenceHash: evidence.acquisitionHash, parameterHash: verified.parameterHash, decisionInputsHash: canonical.decisionInputsHash, optimizerHash: hash(optimizer), decisionIntelligenceHash: canonical.analysis.integrityHash, artifactHash: artifact.artifact?.artifactHash || null, learningHash: learning.learningHash } };
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
