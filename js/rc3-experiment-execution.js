'use strict';

const REQUIRED_CONTRACT = [
  'caseId','decisionQuestion','marginalUnit','marginalQuantity','intervention',
  'statusQuo','alternatives','primaryOutcome','timeHorizon','successThreshold',
  'counterfactualDesign','measurementPlan','predictionFreeze','stopRule'
];

const ALLOWED_COUNTERFACTUALS = [
  'randomized','quasi-experimental','matched-comparison','interrupted-time-series',
  'controlled-before-after','contribution-analysis','descriptive-only'
];

const HISTORICAL_BOUNDARY = '2023-12-06';
const CHECKPOINTS = ['6mo','1yr','2yr','5yr'];

function assertExperimentContract(contract) {
  if (!contract || typeof contract !== 'object') throw new TypeError('experiment contract is required');
  const missing = REQUIRED_CONTRACT.filter(k => contract[k] === undefined || contract[k] === null || contract[k] === '');
  if (missing.length) throw new TypeError(`missing experiment fields: ${missing.join(',')}`);
  if (!Number.isFinite(contract.marginalQuantity) || contract.marginalQuantity <= 0) throw new RangeError('marginalQuantity must be positive and finite');
  if (!ALLOWED_COUNTERFACTUALS.includes(contract.counterfactualDesign)) throw new RangeError('unsupported counterfactual design');
  if (!Array.isArray(contract.alternatives) || contract.alternatives.length === 0) throw new TypeError('at least one alternative is required');
  if (!Array.isArray(contract.predictionFreeze) || contract.predictionFreeze.length === 0) throw new TypeError('predictionFreeze is required');
  return true;
}

function freezePrediction(prediction) {
  if (!prediction || typeof prediction !== 'object') throw new TypeError('prediction is required');
  if (prediction.frozenAt === undefined || prediction.frozenAt === null) throw new TypeError('frozenAt is required');
  return Object.freeze({ ...prediction, immutable: true });
}

function admissibilityIssues(evidence = {}) {
  const issues = [];
  if (!evidence.sourceId) issues.push('missing-source');
  if (!evidence.sourceDate) issues.push('missing-source-date');
  if (!evidence.intervention) issues.push('missing-intervention');
  if (!evidence.population) issues.push('missing-population');
  if (!evidence.exposure) issues.push('missing-exposure');
  if (!evidence.outcome) issues.push('missing-outcome');
  if (!evidence.comparator) issues.push('missing-comparator');
  if (!evidence.provenance) issues.push('missing-provenance');
  if (evidence.isHistorical && evidence.sourceDate > HISTORICAL_BOUNDARY) issues.push('post-boundary-evidence');
  if (evidence.beforeAfterOnly && evidence.claimedCausal) issues.push('before-after-not-causal');
  if (evidence.aggregateSpendMasqueradingAsMarginalExposure) issues.push('aggregate-spend-not-marginal-exposure');
  if (evidence.populationMismatch) issues.push('population-mismatch');
  if (evidence.transportabilityFailed) issues.push('transportability-failed');
  if (evidence.stale) issues.push('stale-evidence');
  if (evidence.unresolvedConflict) issues.push('unresolved-evidence-conflict');
  return issues;
}

function evaluateEligibility({ contract, evidence = [] } = {}) {
  assertExperimentContract(contract);
  const issues = evidence.flatMap(admissibilityIssues);
  const eligible = issues.length === 0 && contract.counterfactualDesign !== 'descriptive-only';
  return Object.freeze({ eligible, status: eligible ? 'ELIGIBLE_FOR_EFFECT_ESTIMATION' : 'BLOCKED', issues: Object.freeze(issues) });
}

function createLearningSchedule({ decisionId, originalDecisionHash } = {}) {
  if (!decisionId || !originalDecisionHash) throw new TypeError('decisionId and originalDecisionHash are required');
  return Object.freeze(CHECKPOINTS.map(checkpoint => Object.freeze({ checkpoint, decisionId, originalDecisionHash, status: 'PENDING', observed: null, recalibration: null })));
}

const CASE_PLANS = Object.freeze({
  '003': Object.freeze({
    caseId: '003', candidateId: 'PARAMEDIC_CAPACITY', status: 'PROSPECTIVE_EXPERIMENT',
    decisionQuestion: 'Does an incremental deployment of paramedic crew-hours improve response performance and downstream patient/system outcomes relative to the specified status quo?',
    marginalUnit: 'deployable paramedic crew-hours', marginalQuantity: 1,
    intervention: 'incremental authorized paramedic crew-hours at specified stations/times',
    statusQuo: 'same authorized service configuration without the incremental crew-hours',
    alternatives: Object.freeze(['no allocation/status quo','alternative station/time deployment','alternative public-safety intervention if a common resource unit can be established']),
    primaryOutcome: 'pre-registered response-performance measure linked to the exposed crew-hours',
    timeHorizon: 'pre-registered operational window plus 6mo/1yr/2yr/5yr learning checkpoints',
    successThreshold: 'pre-registered threshold set before outcome observation; no numeric effect invented until exposure and baseline are available',
    counterfactualDesign: 'quasi-experimental',
    measurementPlan: 'authorized allocation ledger + timestamped deployment exposure + comparable control/comparison periods/units + operational and downstream outcomes',
    predictionFreeze: Object.freeze(['directional improvement is predicted for the primary response-performance measure; magnitude remains unspecified until pre-exposure data are frozen']),
    stopRule: 'predefined maximum exposure/review point with stop, rollback, or reallocation authority',
    evidenceRequirements: Object.freeze(['actual authorized incremental crew-hours','cost attributable to the incremental unit','exposure location/time','baseline/comparator','primary and downstream outcomes','spillover/displacement log','counterfactual identification']),
    historicalBoundary: HISTORICAL_BOUNDARY
  }),
  '011': Object.freeze({
    caseId: '011', candidateId: 'FIRE_RESPONSE_CAPACITY', status: 'PROSPECTIVE_EXPERIMENT',
    decisionQuestion: 'Does incremental fire response capacity improve response performance and downstream outcomes relative to the status quo?',
    marginalUnit: 'deployable fire crew-hours/apparatus-hours', marginalQuantity: 1,
    intervention: 'incremental authorized fire response capacity at specified locations/times',
    statusQuo: 'same authorized fire deployment without the incremental capacity',
    alternatives: Object.freeze(['status quo','alternative deployment configuration','alternative intervention only if comparable resource unit exists']),
    primaryOutcome: 'pre-registered response-performance measure for exposed incidents',
    timeHorizon: 'pre-registered operational window plus longitudinal learning checkpoints',
    successThreshold: 'pre-registered before exposure; no causal benefit inferred from aggregate call-volume or response totals alone',
    counterfactualDesign: 'quasi-experimental',
    measurementPlan: 'allocation/exposure ledger + comparable incident/area/time controls + response and downstream outcomes + displacement tracking',
    predictionFreeze: Object.freeze(['directional improvement is predicted for the primary response-performance measure; effect magnitude is unknown']),
    stopRule: 'maximum authorized exposure and formal review/rollback point',
    evidenceRequirements: Object.freeze(['incremental crew/apparatus exposure','marginal cost','incident-level comparator','outcome linkage','spillover/displacement','counterfactual design']),
    historicalBoundary: HISTORICAL_BOUNDARY
  }),
  '012': Object.freeze({
    caseId: '012', candidateId: 'COMMUNITY_PARAMEDIC_SUPPORTS', status: 'PROSPECTIVE_EXPERIMENT',
    decisionQuestion: 'Does an incremental community-paramedic service dose improve the pre-specified patient/system outcome relative to the status quo?',
    marginalUnit: 'community-paramedic visit/team-hours or eligible-patient service dose', marginalQuantity: 1,
    intervention: 'incremental authorized community-paramedic service dose for an eligible population',
    statusQuo: 'usual care/service configuration without the incremental dose',
    alternatives: Object.freeze(['status quo/usual care','alternative service dose','alternative intervention only if population and resource unit are comparable']),
    primaryOutcome: 'pre-registered patient/system outcome attributable to the service dose',
    timeHorizon: 'pre-registered service window plus 6mo/1yr/2yr/5yr learning checkpoints',
    successThreshold: 'pre-registered threshold before outcomes; descriptive utilization change is not sufficient for causal eligibility',
    counterfactualDesign: 'matched-comparison',
    measurementPlan: 'authorized service-dose ledger + eligibility + matched comparator + outcome measurement + spillover/displacement + data-quality checks',
    predictionFreeze: Object.freeze(['directional improvement is predicted for the primary outcome; magnitude remains unspecified until the exposure and comparator are frozen']),
    stopRule: 'predefined maximum service exposure and safety/review checkpoint',
    evidenceRequirements: Object.freeze(['actual incremental service dose','eligible population','marginal cost','matched comparator','primary/downstream outcomes','spillover log','counterfactual validation']),
    historicalBoundary: HISTORICAL_BOUNDARY
  })
});

module.exports = { REQUIRED_CONTRACT, ALLOWED_COUNTERFACTUALS, HISTORICAL_BOUNDARY, CHECKPOINTS, CASE_PLANS, assertExperimentContract, freezePrediction, admissibilityIssues, evaluateEligibility, createLearningSchedule };
