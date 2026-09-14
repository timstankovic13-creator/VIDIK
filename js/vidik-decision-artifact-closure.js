'use strict';

const crypto = require('node:crypto');

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(stable(value)).digest('hex');
}

function finitePositive(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function buildCounterfactual({ statusQuo = null, candidate = null, analysis = null, gate = null } = {}) {
  const baseline = statusQuo && typeof statusQuo === 'object' ? { ...statusQuo } : { explicit: false };
  const estimate = Number(analysis?.estimate ?? analysis?.effect ?? analysis?.parameter?.value);
  const resource = Number(analysis?.resource ?? analysis?.marginal?.resource);
  const effectUnit = analysis?.effectUnit || analysis?.parameter?.unit || null;
  const resourceUnit = analysis?.resourceUnit || analysis?.marginal?.resourceUnit || null;
  const hasQuantitativeInputs = Number.isFinite(estimate) && finitePositive(resource) && Boolean(effectUnit) && Boolean(resourceUnit);
  const eligible = Boolean(gate?.recommendationEligible && hasQuantitativeInputs && baseline.explicit === true);
  return {
    status: eligible ? 'quantified' : (baseline.explicit ? 'unquantified' : 'blocked'),
    baseline,
    candidateId: candidate?.id || null,
    candidateName: candidate?.name || null,
    estimatedIncrementalEffect: eligible ? estimate : null,
    effectUnit,
    resource: eligible ? resource : null,
    resourceUnit,
    unknownIsNotZero: !eligible,
    recommendationEligible: eligible,
    limitation: eligible ? null : 'causal-and-resource-quantification-required'
  };
}

function buildDecisionArtifact({ problem, run, candidate = null, gate = null, analysis = {}, statusQuo = null, whyWhyNot = null, override = null, counterfactual = null, evidence = {} } = {}) {
  const decision = run?.decision || {};
  const artifact = {
    schemaVersion: 'vidik.decision-artifact.v1',
    problem,
    createdAt: new Date().toISOString(),
    statusQuo: statusQuo || { explicit: false },
    candidate: candidate ? { id: candidate.id || null, name: candidate.name || null, discovery: candidate.discovery || null } : null,
    recommendation: decision.recommendation || null,
    recommendationAllowed: Boolean(gate?.recommendationEligible && decision.recommendationAllowed),
    gates: gate?.gates || null,
    evidence: evidence || {},
    analysis: analysis || {},
    whyWhyNot: whyWhyNot || null,
    counterfactual: counterfactual || null,
    override: override || { applied: false },
    provenance: {
      executionHash: run?.runHash || null,
      candidateUniverseHash: run?.governance?.candidateUniverseIntelligence ? sha256(run.governance.candidateUniverseIntelligence) : null,
      learningHash: run?.learningDiscovery?.learningHash || null
    }
  };
  return { ...artifact, artifactHash: sha256(artifact) };
}

function validateDecisionArtifact(artifact) {
  if (!artifact || typeof artifact !== 'object') return { valid: false, reasons: ['artifact-missing'] };
  const { artifactHash, ...body } = artifact;
  const reasons = [];
  if (!artifactHash || artifactHash !== sha256(body)) reasons.push('artifact-hash-mismatch');
  const allowed = artifact.recommendationAllowed === true;
  if (allowed && !artifact.recommendation) reasons.push('recommendation-missing');
  if (allowed) {
    const gates = artifact.gates || {};
    for (const gate of ['A_evidenceQuality', 'B_candidateParameter', 'C_marginalResourceEffect', 'D_uncertaintyVOIOptimization', 'E_decisionReadiness']) {
      if (gates[gate] !== true) reasons.push(`recommendation-without-${gate}`);
    }
  }
  if (!allowed && artifact.recommendation) reasons.push('blocked-artifact-has-recommendation');
  if (allowed && artifact.statusQuo?.explicit !== true) reasons.push('status-quo-missing');
  if (allowed && artifact.candidate?.discovery?.leadOnly === true) reasons.push('lead-only-candidate-recommended');
  if (allowed && artifact.counterfactual?.status !== 'quantified') reasons.push('counterfactual-unquantified');
  if (allowed && artifact.counterfactual?.recommendationEligible !== true) reasons.push('counterfactual-not-eligible');
  return { valid: reasons.length === 0, reasons, immutableHash: artifactHash || null };
}

function buildReviewPlan({ artifactHash, checkpoints = [6, 12, 24, 60] } = {}) {
  const normalized = Array.isArray(checkpoints) ? checkpoints.map(Number) : [];
  const valid = normalized.length > 0 && normalized.every(finitePositive) && new Set(normalized).size === normalized.length;
  if (!valid) throw new Error('review-checkpoints-invalid');
  return {
    schemaVersion: 'vidik.outcome-review-plan.v1',
    baselineArtifactHash: artifactHash || null,
    checkpoints: normalized.map(months => ({ months, required: true, attribution: 'required', drift: 'required', parameterMutation: 'human-review-only' })),
    immutableBaseline: true,
    automaticParameterMutation: false,
    reviewHash: sha256({ artifactHash, checkpoints: normalized })
  };
}

module.exports = { stable, sha256, buildCounterfactual, buildDecisionArtifact, validateDecisionArtifact, buildReviewPlan };
