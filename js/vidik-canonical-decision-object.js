'use strict';

const { CANONICAL_18, LEARNING_CHECKPOINTS, validateDecisionObject } = require('./vidik-architecture-contract');
const DI97 = require('./decision-intelligence-9.7');

function buildDecisionIntelligence(run, interventions, selected) {
  const candidates = interventions.filter(x => x?.gate?.causalEvidence && Number.isFinite(Number(x.gate.causalEvidence.estimate)) && x.status === 'ADMISSIBLE');
  if (!candidates.length) return { version: DI97.VERSION, status: 'NO_ADMISSIBLE_CAUSAL_PARAMETERS', sensitivity: null, recommendationFlips: [], uncertainty: null, voi: null, integrityHash: DI97.hash({ status: 'NO_ADMISSIBLE_CAUSAL_PARAMETERS' }) };
  const parameters = candidates.map(x => ({ id: `${x.id}:effect`, low: Number(x.gate.causalEvidence.uncertainty?.low), mean: Number(x.gate.causalEvidence.estimate), high: Number(x.gate.causalEvidence.uncertainty?.high) }));
  const baseline = Object.fromEntries(parameters.map(p => [p.id, p.mean]));
  const baseScores = Object.fromEntries(candidates.map(x => [x.id, Number(x.score)]));
  const currentEffects = Object.fromEntries(candidates.map(x => [x.id, Number(x.gate.causalEvidence.estimate)]));
  const scoreFn = values => {
    const rows = candidates.map(x => {
      const current = currentEffects[x.id], effect = Number(values[`${x.id}:effect`] ?? current), risk = Number(x.risk || 0);
      const score = baseScores[x.id] + (effect - current) * (1 - risk);
      return { id: x.id, score, name: x.name };
    }).filter(x => Number.isFinite(x.score)).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    return rows.length ? { recommendation: rows[0].id, score: rows[0].score, ranking: rows } : { recommendation: null, score: null, ranking: [] };
  };
  const voiCandidates = parameters.map(p => {
    const lowResult = scoreFn({ ...baseline, [p.id]: p.low });
    const highResult = scoreFn({ ...baseline, [p.id]: p.high });
    return { id: p.id, currentValue: scoreFn(baseline).score, lowValue: lowResult.score, highValue: highResult.score, pHigh: .5, cost: 0, lowRecommendation: lowResult.recommendation, highRecommendation: highResult.recommendation, recommendations: [lowResult.recommendation, highResult.recommendation] };
  });
  return DI97.analyze({ baseline, parameters, correlations: Array.isArray(run?.correlations) ? run.correlations : [], scoreFn, candidates: voiCandidates, decisionValue: 1, sensitivitySteps: 21, uncertaintySamples: 2000 });
}

function buildCanonicalDecisionObject(run) {
  const city = run?.city || null;
  const interventions = run?.interventionComparison || [];
  const selected = interventions.find(x => x.id === run?.recommendation) || null;
  const causal = selected?.gate?.causalEvidence || null;
  const suppliedResource = run?.resourceEnvelope?.marginalUnit || null;
  const optimization = run?.optimization || null;
  const decisionIntelligence = run?.decisionIntelligence || buildDecisionIntelligence(run, interventions, selected);
  const evidenceNodes = [
    run?.sourceLineage ? { id: `municipal:${city}`, kind: 'observed_context', provenance: run.sourceLineage } : null,
    causal ? { id: causal.id, kind: 'causal_effect', provenance: causal } : null,
    ...(optimization?.candidates || []).flatMap(candidate => (candidate.evidenceIds || []).map(id => ({ id, kind: 'resource_chain', provenance: candidate })))
  ].filter(Boolean);
  const claims = causal ? [{ id: `${causal.id}:claim:0`, type: 'causal_effect', evidenceIds: [causal.id], burden: 'causal' }] : [];
  const parameter = causal ? { id: `${selected.id}:effect`, value: causal.estimate, unit: causal.unit, evidenceIds: [causal.id], uncertainty: causal.uncertainty, transportability: causal.mode || null } : null;
  const object = {
    identityBrief: { decisionId: run?.decisionId || null, city, objective: run?.objective || null, schemaVersion: 'vidik.canonical-decision-object.v1', immutableSnapshot: true },
    resourceEnvelope: { marginalUnit: suppliedResource || { amount: null, unit: 'CAD', status: 'not-specified-in-three-city-acceptance-run' }, optimizationStatus: optimization?.status || (suppliedResource ? 'NOT_ACTIVATED' : 'NOT_SPECIFIED'), feedback: optimization?.feedback || null },
    objectives: { primary: run?.objective || null },
    constraints: { admissibility: true, failureClosed: Boolean(run?.audit?.failureClosed) },
    interventionUniverse: { interventions: interventions.map(x => ({ id: x.id, name: x.name, status: x.status, score: x.score })) },
    evidenceGraph: { nodes: evidenceNodes, lineage: run?.lineage || [] },
    claimScaledEvidence: { claims, minimumSufficientEvidence: { status: claims.length ? 'candidate-set-present' : 'not-satisfied', requiredClaimType: 'causal_effect' } },
    parameters: { selected: parameter, all: interventions.filter(x => x.gate?.causalEvidence).map(x => ({ id: `${x.id}:effect`, value: x.gate.causalEvidence.estimate, unit: x.gate.causalEvidence.unit, evidenceIds: [x.gate.causalEvidence.id], uncertainty: x.gate.causalEvidence.uncertainty || null })) },
    causalProductionModel: { chain: ['marginal_resource', 'capacity', 'activity', 'immediate_outcome', 'system_outcome', 'serious_harm_pathway'], selectedParameter: parameter, observedMunicipalDataIsNotCausal: true, resourceTranslation: optimization ? { status: optimization.status, allocation: optimization.allocation, candidates: optimization.candidates } : null },
    uncertaintyBudget: { parameters: causal ? [{ parameterId: `${selected.id}:effect`, ...causal.uncertainty }] : [], totalStatus: causal ? 'parameter-level' : 'empty', decisionIntelligence },
    optimizationOpportunityCost: { marginalResourceOptimization: optimization?.status === 'OPTIMIZED', status: optimization?.status || 'NOT_ACTIVATED', competingInterventions: optimization?.candidates || interventions.map(x => ({ id: x.id, status: x.status, score: x.score })), allocation: optimization?.allocation || null, opportunityCost: optimization?.opportunityCost || null, feedback: optimization?.feedback || null },
    rationale: { recommendation: run?.recommendation || null, why: selected ? `${selected.name} is admissible and highest-scoring among the evaluated admissible interventions.` : 'No intervention cleared the admissibility gates.', whyNot: run?.audit?.blockedAlternatives || [], resourceDecision: optimization?.feedback || null },
    integrity: { decisionIntegrity: true, evidenceHash: run?.audit?.evidenceHash || null, reproducibleRun: true, scenario: Boolean(run?.audit?.scenario), syntheticEvidenceExcluded: true, decisionIntelligenceHash: decisionIntelligence.integrityHash },
    counterfactualVault: { records: run?.counterfactual ? [{ ...run.counterfactual, decisionId: run.decisionId, durableRecord: true }] : [], status: run?.counterfactual ? 'RECORDED' : 'NOT_ESTIMABLE' },
    governanceOverridesAudit: { humanOverride: null, overrideRequired: false, audit: run?.audit || null },
    outcomeLearningCheckpoints: { checkpoints: [...LEARNING_CHECKPOINTS], current: run?.learning || null, syntheticDefaultLearning: false, recalibrationMutatesParametersAutomatically: false },
    driftFailureRegistry: { drift: run?.learning?.drift || null, failureClosed: Boolean(run?.audit?.failureClosed), failureReasons: run?.audit?.blockedAlternatives || [] },
    reoptimizationExecutionReadiness: { reoptimization: optimization?.status === 'OPTIMIZED' ? 'resource-allocation-computed' : 'available-after-observed-outcome-or-new-evidence', executionReadiness: 'separate-assessment-required', evidenceAcquisition: city ? { targetCity: city, status: run?.recommendation ? 'not-required-for-selected-claim' : 'required' } : null }
  };
  const validation = validateDecisionObject(object);
  if (!validation.valid) throw new Error(`canonical-decision-object-invalid:${validation.failures.map(x => x.code).join(',')}`);
  return object;
}

module.exports = { CANONICAL_18, buildCanonicalDecisionObject, buildDecisionIntelligence };
