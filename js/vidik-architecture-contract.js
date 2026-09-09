'use strict';

const CANONICAL_18 = Object.freeze([
  'identityBrief',
  'resourceEnvelope',
  'objectives',
  'constraints',
  'interventionUniverse',
  'evidenceGraph',
  'claimScaledEvidence',
  'parameters',
  'causalProductionModel',
  'uncertaintyBudget',
  'optimizationOpportunityCost',
  'rationale',
  'integrity',
  'counterfactualVault',
  'governanceOverridesAudit',
  'outcomeLearningCheckpoints',
  'driftFailureRegistry',
  'reoptimizationExecutionReadiness'
]);

const LEARNING_CHECKPOINTS = Object.freeze(['6-month', '1-year', '2-year', '5-year']);

const CONCEPTS = Object.freeze({
  claimScaledEvidence: 'Evidence burden scales with the decision claim; descriptive evidence cannot silently satisfy causal claims.',
  minimumSufficientEvidence: 'The minimum evidence set required for an admissible decision is explicit and testable.',
  causalAdmissibility: 'Every causal parameter has an admissibility gate and a failure reason.',
  transportability: 'Source-to-target transport is an explicit evidence judgment, never an implicit geography shortcut.',
  marginalResourceOptimization: 'Optimization operates on marginal resource units rather than only total-program comparisons.',
  opportunityCost: 'The value of the marginal resource is compared across competing admissible interventions.',
  uncertaintyBudget: 'Material parameter uncertainty is represented, bounded, and propagated to decision sensitivity.',
  voi: 'Evidence acquisition is prioritized by expected decision value, not merely by evidence volume.',
  sensitivityFlip: 'The system identifies parameter changes that can flip the recommendation.',
  counterfactualDesign: 'Every recommendation has an explicit status-quo/counterfactual interpretation where estimable.',
  executionReadiness: 'A recommendation is distinct from readiness to execute it.',
  evidenceAcquisition: 'Missing evidence produces an acquisition path rather than silent imputation.',
  semanticMunicipalMapping: 'Observed municipal fields carry meaning, unit, aggregation, role, and provenance.',
  provenanceFreshness: 'Evidence has source identity, retrieval time, freshness/staleness state, and lineage.',
  failureClosed: 'When admissibility or integrity requirements fail, no recommendation is manufactured.',
  outcomeLearning: 'Observed outcomes are provenance-bound and cannot masquerade as synthetic acceptance data.',
  recalibrationNoMutation: 'Learning may propose bounded recalibration but cannot silently mutate production parameters.',
  driftDetection: 'Prediction error and other monitored metrics can trigger drift without silently changing the model.',
  decisionIntegrity: 'Decision integrity is a first-class object covering lineage, consistency, attacks, and reproducibility.',
  humanOverride: 'Overrides are explicit, attributed, reasoned, and auditable.',
  governanceAudit: 'Governance and audit records survive the decision lifecycle.',
  immutableIdentity: 'A decision snapshot has immutable identity/version/lineage semantics.',
  counterfactualVault: 'Counterfactuals are retained as durable decision records rather than transient UI calculations.',
  failureRegistry: 'Failure modes are registered and reusable for future runs and adversarial testing.',
  syntheticDecisionLab: 'Synthetic scenarios are isolated from production evidence and clearly labelled.',
  evidenceUniverse: 'The 115-source evidence universe is a governed evidence inventory, not a blanket causal authorization.',
  threeCityProduction: 'Ottawa, Toronto, and Melbourne exercise the full source-to-decision production path.',
  comparableCityAcquisition: 'Comparable cities can surface transferable evidence and unconventional approaches, but similarity never bypasses admissibility.'
});

function validateDecisionObject(decision) {
  const missing = CANONICAL_18.filter(part => !decision || decision[part] == null);
  const failures = [];
  if (missing.length) failures.push({ code: 'CANONICAL_PART_MISSING', parts: missing });
  if (decision?.identityBrief?.decisionId == null) failures.push({ code: 'IMMUTABLE_DECISION_ID_MISSING' });
  if (decision?.resourceEnvelope?.marginalUnit == null) failures.push({ code: 'MARGINAL_RESOURCE_UNIT_MISSING' });
  if (!Array.isArray(decision?.interventionUniverse?.interventions)) failures.push({ code: 'INTERVENTION_UNIVERSE_MISSING' });
  if (!Array.isArray(decision?.evidenceGraph?.nodes)) failures.push({ code: 'EVIDENCE_GRAPH_MISSING' });
  if (!Array.isArray(decision?.claimScaledEvidence?.claims)) failures.push({ code: 'CLAIM_SCALED_EVIDENCE_MISSING' });
  if (!Array.isArray(decision?.uncertaintyBudget?.parameters)) failures.push({ code: 'UNCERTAINTY_BUDGET_MISSING' });
  if (!Array.isArray(decision?.outcomeLearningCheckpoints?.checkpoints) || !LEARNING_CHECKPOINTS.every(x => decision.outcomeLearningCheckpoints.checkpoints.includes(x))) failures.push({ code: 'LEARNING_CHECKPOINTS_INCOMPLETE' });
  return { valid: failures.length === 0, missing, failures, parts: CANONICAL_18.length };
}

module.exports = { CANONICAL_18, LEARNING_CHECKPOINTS, CONCEPTS, validateDecisionObject };
