'use strict';

const HISTORICAL_BOUNDARY = '2023-12-06';
const CHECKPOINTS = Object.freeze(['6mo', '1yr', '2yr', '5yr']);

// Evidence leads are acquisition targets, not causal estimates. Exposure must be
// supplied by an authorized execution/allocation record before promotion.
const ACQUISITION = Object.freeze({
  '004': { name: 'OPS frontline staffing', evidenceStatus: 'EVIDENCE_LOCATED', exposureStatus: 'EXPOSURE_UNVERIFIED', sourceLeads: ['https://ottawa.ca/en/city-hall/budget-finance-and-corporate-planning/previous-budgets/budget-2023/draft-budget-2023-glance'], acquisitionTarget: 'officer-level deployment hours, timing, geography, assignment, and candidate-specific outcome linkage', blocker: 'public budget establishes staffing investment but not marginal officer-hour exposure or causal counterfactual' },
  '005': { name: 'OC Transpo Special Constables', evidenceStatus: 'EVIDENCE_LOCATED', exposureStatus: 'EXPOSURE_UNVERIFIED', sourceLeads: ['https://documents.ottawa.ca/sites/default/files/FINAL%202026%20Budget%20Magazine%20English.pdf','https://ottawa.ca/en/city-hall/city-news/newsroom/transit-committee-receives-update-oc-transpos-action-plan-improve-transit-services'], acquisitionTarget: 'constable deployment hours, locations/times, calls/incidents, and comparable untreated exposure', blocker: 'staffing and call-volume evidence exists, but marginal deployment exposure and defensible counterfactual are not public in the located sources' },
  '006': { name: 'ANCHOR prototype', evidenceStatus: 'EVIDENCE_LOCATED', exposureStatus: 'EXPOSURE_UNVERIFIED', sourceLeads: ['https://ottawa.ca/en/family-and-social-services/community-safety-and-well-being-cswb-plan/about-cswb-plan/2023-2024-progress-report'], acquisitionTarget: 'call-level dispatch/acceptance/response exposure, eligible comparison calls/areas, downstream outcomes', blocker: 'launch and call volume are documented, but candidate-specific exposure and counterfactual data are required' },
  '007': { name: 'Downtown Safety Outreach', evidenceStatus: 'EVIDENCE_LOCATED', exposureStatus: 'EXPOSURE_UNVERIFIED', sourceLeads: ['https://ottawa.ca/en/city-hall/open-transparent-and-accountable-government/public-disclosure/memoranda-issued-members-council/memoranda-issued-community-and-social-services/memo-downtown-safety-outreach-partnership-update-may-30-2025'], acquisitionTarget: 'team-hours by area/time, participant contacts, police/EMS substitution outcomes, concurrent interventions', blocker: 'funding and program structure are public, but marginal outreach-hour exposure and attribution are not established' },
  '008': { name: 'Youth Social Development', evidenceStatus: 'EVIDENCE_LOCATED', exposureStatus: 'EXPOSURE_UNVERIFIED', sourceLeads: ['https://documents.ottawa.ca/sites/default/files/CSWBP-2025-ProgressReport_EN.pdf'], acquisitionTarget: 'participant-level program hours/intensity, eligibility, comparison group, pre-specified safety outcome', blocker: 'funding and project counts are public, but participant exposure and outcome linkage are not established' },
  '009': { name: 'Traffic Safety Action', evidenceStatus: 'EVIDENCE_LOCATED', exposureStatus: 'EXPOSURE_UNVERIFIED', sourceLeads: ['https://ottawa.ca/en/parking-roads-and-travel/road-safety/road-safety-action-plan/2023-implementation-plan','https://ottawa.ca/en/parking-roads-and-travel/road-safety/road-safety-action-plan/fatal-and-major-injury-collision-data'], acquisitionTarget: 'treatment-level implementation dates/intensity, site traffic exposure, untreated comparison sites, FMI outcomes', blocker: 'citywide plan and collision series are available, but treatment-level marginal exposure and causal comparison must be established' },
  '010': { name: 'Red Light Camera', evidenceStatus: 'EVIDENCE_LOCATED', exposureStatus: 'EXPOSURE_UNVERIFIED', sourceLeads: ['https://ottawa.ca/en/parking-roads-and-travel/road-safety/enforcement/red-light-cameras'], acquisitionTarget: 'site operating dates, camera exposure/violations, traffic volumes, matched untreated intersections, collision outcomes', blocker: 'camera inventory is public, but site-level exposure variation and credible untreated comparison are required' },
  '011': { name: 'Fire Response Capacity', evidenceStatus: 'EVIDENCE_LOCATED', exposureStatus: 'EXPOSURE_UNVERIFIED', sourceLeads: ['https://documents.ottawa.ca/sites/documents/files/Document%205%20-%20Draft%20Budget%202024%20Report.pdf','https://documents.ottawa.ca/sites/default/files/2025_eps_amp_en.pdf'], acquisitionTarget: 'apparatus/firefighter availability by incident/time, dispatch/arrival times, incident severity, comparable capacity states', blocker: 'response performance is public, but marginal response-hour exposure and incident-level causal comparison are not established' },
  '012': { name: 'Community Paramedic Supports', evidenceStatus: 'EVIDENCE_LOCATED', exposureStatus: 'EXPOSURE_UNVERIFIED', sourceLeads: ['https://documents.ottawa.ca/sites/default/files/2024%20Adopted%20Budget%20Book%20English%20Condensed-AODA.pdf','https://ottawa.ca/en/city-hall/city-news/newsroom/mayor-sutcliffe-presents-citys-public-safety-action-plan'], acquisitionTarget: 'community-paramedic hours/patient contacts, eligible cohort, comparator, emergency utilization and serious-harm outcomes', blocker: 'program existence/funding and broader paramedic staffing evidence are public, but marginal community-paramedic exposure and causal comparator are not established' },
  '013': { name: 'OPS Body-Worn Cameras', evidenceStatus: 'EVIDENCE_LOCATED', exposureStatus: 'EXPOSURE_UNVERIFIED', sourceLeads: ['https://ottawa.ca/en/city-hall/city-news/newsroom/mayor-sutcliffe-presents-citys-public-safety-action-plan'], acquisitionTarget: 'officer/unit rollout dates, camera-equipped officer-hours, eligible incidents, matched untreated units, outcomes', blocker: 'rollout plan is public, but staggered exposure and comparable untreated units must be obtained' },
  '014': { name: 'Emergency Shelter Capacity', evidenceStatus: 'EVIDENCE_LOCATED', exposureStatus: 'EXPOSURE_UNVERIFIED', sourceLeads: ['https://documents.ottawa.ca/sites/default/files/2024-HNA_EN.pdf','https://documents.ottawa.ca/sites/default/files/2024HHReport_EN.pdf'], acquisitionTarget: 'bed-night capacity changes by site/date, occupancy/demand, client outcomes, comparable demand periods/areas', blocker: 'capacity and demand series are public, but marginal bed-night exposure and downstream causal attribution are not established' }
});

for (const item of Object.values(ACQUISITION)) Object.freeze(item);

function getAcquisition(caseId) {
  if (!ACQUISITION[caseId]) throw new Error(`Unsupported acquisition case: ${caseId}`);
  return Object.freeze({
    ...ACQUISITION[caseId],
    historicalBoundary: HISTORICAL_BOUNDARY,
    checkpoints: CHECKPOINTS,
    promotionStatus: 'BLOCKED_PENDING_ACTUAL_EXPOSURE_AND_COUNTERFACTUAL',
    effectEstimate: null,
    roi: null,
    recommendation: null
  });
}

function evaluateAcquisition(caseId, { authorizedAllocation, actualExposure, admissibleEvidence, defensibleCounterfactual, measurementReady } = {}) {
  const base = getAcquisition(caseId);
  const ready = [authorizedAllocation, actualExposure, admissibleEvidence, defensibleCounterfactual, measurementReady].every(Boolean);
  return Object.freeze({ ...base, promotionStatus: ready ? 'READY_FOR_EFFECT_ESTIMATION' : 'BLOCKED_PENDING_EXECUTION_GATES' });
}

module.exports = { ACQUISITION, HISTORICAL_BOUNDARY, CHECKPOINTS, getAcquisition, evaluateAcquisition };
