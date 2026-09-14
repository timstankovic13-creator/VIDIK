'use strict';

const { recommendationGate, buildStatusQuo, sensitivity, estimateVOI } = require('./decision-engine');
const { optimize } = require('./optimizer');
const { buildTransferSet } = require('./learning-engine');
const { createDecisionArtifact } = require('./artifact-engine');

function text(x) { return String(x ?? '').trim(); }

function runDecisionPipeline(problem, candidates = [], context = {}) {
  const statusQuo = context.statusQuo?.explicit ? context.statusQuo : buildStatusQuo(context.statusQuo || {});
  const transfers = buildTransferSet(problem, context.comparableCities || []);
  const gates = candidates.map(candidate => recommendationGate(candidate, { problem, statusQuo }));
  const optimizer = optimize(problem, candidates, context);
  const eligible = gates.filter(g => g.allowed);
  const selected = optimizer.selected && eligible.some(g => g.candidateId === optimizer.selected.candidateId)
    ? optimizer.selected
    : null;
  const recommendation = selected
    ? { allowed: true, candidateId: selected.candidateId, reason: 'all-gates-passed-and-optimizer-selected' }
    : { allowed: false, reason: eligible.length ? 'optimizer-selected-candidate-failed-integration-check' : 'no-candidate-passed-all-gates' };
  const blockedByIntegration = optimizer.selected && !selected ? [optimizer.selected.candidateId] : [];
  return {
    problem: text(problem),
    statusQuo,
    comparableCityTransfer: transfers,
    gates,
    optimizer,
    recommendation,
    blockedByIntegration,
    readyForArtifact: recommendation.allowed === true,
    rule: 'No recommendation may bypass the evidence gates, optimizer, status quo, or artifact contract.'
  };
}

function prepareAnalysis(candidate, scenarios = [], voi = {}) {
  return {
    sensitivity: sensitivity(candidate, scenarios),
    voi: estimateVOI(voi),
    parameterMutationAllowed: false
  };
}

async function finalizeArtifact(pipeline, input = {}) {
  if (!pipeline?.readyForArtifact) throw new Error('orchestrator-recommendation-not-eligible');
  return createDecisionArtifact({
    ...input,
    problem: pipeline.problem,
    statusQuo: pipeline.statusQuo,
    recommendation: pipeline.recommendation,
    opportunityCost: pipeline.optimizer.opportunityCost || {},
    governance: {
      ...(input.governance || {}),
      comparableCityEffectsImported: pipeline.comparableCityTransfer.eligible.some(r => r.causalEffectImported === true),
      effectsImported: false,
      parameterMutationAllowed: false
    }
  });
}

module.exports = { runDecisionPipeline, prepareAnalysis, finalizeArtifact };
