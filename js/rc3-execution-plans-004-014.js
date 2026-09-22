'use strict';

const CHECKPOINTS = Object.freeze(['6mo', '1yr', '2yr', '5yr']);
const HISTORICAL_BOUNDARY = '2023-12-06';

const PLANS = Object.freeze({
  '004': { name: 'OPS frontline staffing', marginalResourceUnit: 'deployable officer-hours', intervention: 'additional frontline policing capacity', primaryOutcome: 'candidate-specific serious-harm/system outcome', counterfactual: 'quasi-experimental or matched comparison where feasible', acquisitionBlocker: 'authorized marginal officer-hour exposure and defensible candidate-specific counterfactual are not yet established' },
  '005': { name: 'OC Transpo Special Constables', marginalResourceUnit: 'deployable special-constable hours', intervention: 'additional transit special-constable capacity', primaryOutcome: 'candidate-specific transit safety/system outcome', counterfactual: 'matched comparison or interrupted time series with credible exposure variation', acquisitionBlocker: 'marginal deployment exposure, comparator, and attribution must be established' },
  '006': { name: 'ANCHOR prototype', marginalResourceUnit: 'deployable ANCHOR response hours', intervention: 'additional community crisis co-response capacity', primaryOutcome: 'candidate-specific emergency-system/serious-harm outcome', counterfactual: 'matched comparison or quasi-experimental design using eligible calls/areas', acquisitionBlocker: 'individual/call-level exposure and defensible counterfactual are required' },
  '007': { name: 'Downtown Safety Outreach', marginalResourceUnit: 'deployable outreach-team hours', intervention: 'additional downtown outreach capacity', primaryOutcome: 'candidate-specific police/emergency-system utilization or serious-harm outcome', counterfactual: 'matched area/time comparison or quasi-experimental design', acquisitionBlocker: 'marginal exposure and attribution to outreach must be isolated from concurrent interventions' },
  '008': { name: 'Youth Social Development', marginalResourceUnit: 'participant-serving program-hours', intervention: 'additional youth-development capacity', primaryOutcome: 'pre-specified youth safety/serious-harm pathway outcome', counterfactual: 'matched participant/area comparison or quasi-experimental design', acquisitionBlocker: 'candidate-specific exposure, eligible population, and outcome linkage are not yet established' },
  '009': { name: 'Traffic Safety Action', marginalResourceUnit: 'deployable traffic-safety treatment units', intervention: 'additional traffic-safety treatment capacity', primaryOutcome: 'fatal/major-injury collision pathway outcome', counterfactual: 'controlled before/after, matched sites, or quasi-experimental design', acquisitionBlocker: 'treatment-level exposure and a credible untreated comparison are required' },
  '010': { name: 'Red Light Camera', marginalResourceUnit: 'camera-site operating capacity', intervention: 'additional red-light-camera enforcement capacity', primaryOutcome: 'intersection collision/serious-injury outcome', counterfactual: 'matched intersection or staggered implementation design', acquisitionBlocker: 'site-level exposure, implementation timing, and untreated comparison are required' },
  '011': { name: 'Fire Response Capacity', marginalResourceUnit: 'deployable firefighter/apparatus response-hours', intervention: 'additional emergency response capacity', primaryOutcome: 'candidate-specific response/serious-harm outcome', counterfactual: 'quasi-experimental variation in response capacity or matched incidents', acquisitionBlocker: 'marginal capacity exposure and causal incident-level comparison are required' },
  '012': { name: 'Community Paramedic Supports', marginalResourceUnit: 'deployable community-paramedic hours', intervention: 'additional community paramedicine capacity', primaryOutcome: 'candidate-specific emergency utilization/serious-harm outcome', counterfactual: 'matched patient/area or quasi-experimental design', acquisitionBlocker: 'authorized marginal exposure, eligible cohort, and counterfactual are required' },
  '013': { name: 'OPS Body-Worn Cameras', marginalResourceUnit: 'camera-equipped officer-hours', intervention: 'additional BWC-enabled frontline exposure', primaryOutcome: 'pre-specified incident/use-of-force/complaint system outcome', counterfactual: 'staggered rollout, matched officer/unit, or other credible quasi-experimental design', acquisitionBlocker: 'rollout exposure, comparable untreated units, and attribution must be established' },
  '014': { name: 'Emergency Shelter Capacity', marginalResourceUnit: 'deployable shelter-bed nights', intervention: 'additional emergency shelter capacity', primaryOutcome: 'candidate-specific shelter/health/serious-harm pathway outcome', counterfactual: 'matched demand periods/areas or quasi-experimental capacity variation', acquisitionBlocker: 'marginal bed-night exposure and downstream outcome attribution are required' }
});

for (const plan of Object.values(PLANS)) {
  Object.freeze(plan);
}

function getExecutionPlan(caseId) {
  if (!PLANS[caseId]) throw new Error(`Unsupported execution case: ${caseId}`);
  return PLANS[caseId];
}

function createBlockedExecutionTemplate(caseId, decisionId, originalDecisionHash) {
  const plan = getExecutionPlan(caseId);
  if (!decisionId || !originalDecisionHash) throw new Error('decisionId and originalDecisionHash are required');
  return Object.freeze({
    schema: 'RC3_EXECUTION_PLAN_1.0',
    caseId,
    decisionId,
    originalDecisionHash,
    historicalBoundary: HISTORICAL_BOUNDARY,
    plan,
    checkpoints: CHECKPOINTS,
    status: 'BLOCKED',
    recommendationStatus: 'NO_RECOMMENDATION',
    effectEstimate: null,
    roi: null,
    actualExposure: null
  });
}

module.exports = { CHECKPOINTS, HISTORICAL_BOUNDARY, PLANS, getExecutionPlan, createBlockedExecutionTemplate };
