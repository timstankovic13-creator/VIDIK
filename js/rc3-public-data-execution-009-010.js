/**
 * RC3 public-data execution layer for Ottawa Cases 009 (ASE) and 010 (RLC).
 *
 * This module deliberately separates public exposure/outcome data from the
 * historical 2023-12-06 decision plane. It can only promote a case when the
 * supplied public observations support a defensible treatment contrast and
 * measurement chain. Missing operational marginal exposure or counterfactual
 * evidence remains fail-closed.
 */

const CASES = Object.freeze({
  '009': {
    intervention: 'Automated Speed Enforcement',
    exposureUnit: 'site-month enforcement exposure',
    sources: [
      'Ottawa Automated Speed Enforcement Camera Speed Data',
      'Ottawa Automated Speed Enforcement Camera Removal Monitoring Speed Data',
      'Ottawa traffic collision data',
      'Ottawa transportation intersection/midblock volume data'
    ],
    publicEndpointFamilies: [
      'Automated_Speed_Enforcement_Camera_Speed_Data1',
      'Automated_Speed_Enforcement_Camera_Removal_–_Monitoring_Speed_Data',
      'Traffic_Collisions_by_Location_2017-2024_(excluding_2023)',
      'Transportation_Intersection_Volumes_2024',
      'Transportation_Midblock_Volumes_2024'
    ]
  },
  '010': {
    intervention: 'Red Light Camera',
    exposureUnit: 'site-month camera exposure',
    sources: [
      'Ottawa Red Light Camera Violations',
      'Ottawa red-light camera locations',
      'Ottawa traffic collision data',
      'Ottawa transportation intersection volume data'
    ],
    publicEndpointFamilies: [
      'Red_Light_Camera_Locations',
      'Red_Light_Camera_Violations_2015',
      'Red_Light_Camera_Violations_2024',
      'Red_Light_Camera_Violations_2025',
      'Red_Light_Camera_Violations_2026',
      'Traffic_Collisions_by_Location_2017-2024_(excluding_2023)',
      'Transportation_Intersection_Volumes_2024'
    ]
  }
});

const HISTORICAL_BOUNDARY = '2023-12-06';

function assertCase(caseId) {
  if (!CASES[caseId]) throw new Error(`Unknown public-data case: ${caseId}`);
}

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace('%', '').trim());
  return Number.isFinite(n) ? n : null;
}

function normalizeObservation(row) {
  return {
    location: row.Location ?? row.location ?? row.Location_Desc_EN ?? null,
    date: row.Date ?? row.Date_of_Data_Collection ?? row.date ?? null,
    avgSpeed: parseNumber(row.AvgSpeed ?? row.avgSpeed),
    compliance: parseNumber(row.PctCompliance ?? row.pctCompliance),
    highEndSpeeders: parseNumber(row.PctHighEndSpeeders ?? row.pctHighEndSpeeders),
    violations: parseNumber(row.Violations ?? row.Total ?? row.totalViolations),
    collisionCount: parseNumber(row.collisionCount ?? row.CollisionCount),
    trafficVolume: parseNumber(row.trafficVolume ?? row.Volume ?? row.AADT)
  };
}

function summarizePublicData(caseId, observations, metadata = {}) {
  assertCase(caseId);
  const rows = Array.isArray(observations) ? observations.map(normalizeObservation) : [];
  const usableExposure = rows.filter(r => r.location && r.date).length;
  const outcomeRows = rows.filter(r => r.collisionCount !== null).length;
  const trafficRows = rows.filter(r => r.trafficVolume !== null).length;
  const treatmentRows = rows.filter(r =>
    r.compliance !== null || r.highEndSpeeders !== null || r.violations !== null
  ).length;

  return {
    caseId,
    historicalBoundary: HISTORICAL_BOUNDARY,
    intervention: CASES[caseId].intervention,
    exposureUnit: CASES[caseId].exposureUnit,
    rowCount: rows.length,
    usableExposureRows: usableExposure,
    treatmentMeasurementRows: treatmentRows,
    outcomeRows,
    trafficExposureRows: trafficRows,
    sourceRetrievedAt: metadata.sourceRetrievedAt ?? null,
    sourceVersions: metadata.sourceVersions ?? [],
    publicDataStatus: rows.length > 0 ? 'LOCATED_AND_INGESTED' : 'NO_DATA',
    counterfactualStatus: metadata.defensibleCounterfactual === true
      ? 'DEFENSIBLE'
      : 'NOT_ESTABLISHED',
    authorizedMarginalExposureStatus: metadata.authorizedMarginalExposure === true
      ? 'ESTABLISHED'
      : 'NOT_ESTABLISHED',
    measurementStatus: metadata.measurementReady === true
      ? 'READY'
      : 'NOT_READY',
    recommendation: null,
    effectEstimate: null,
    roi: null
  };
}

function evaluatePublicExecution(caseId, summary) {
  assertCase(caseId);
  const gates = {
    publicDataLocated: summary.publicDataStatus === 'LOCATED_AND_INGESTED',
    treatmentExposureMeasured: summary.treatmentMeasurementRows > 0,
    outcomeMeasured: summary.outcomeRows > 0,
    trafficExposureMeasured: summary.trafficExposureRows > 0,
    authorizedMarginalExposure: summary.authorizedMarginalExposureStatus === 'ESTABLISHED',
    defensibleCounterfactual: summary.counterfactualStatus === 'DEFENSIBLE',
    measurementReady: summary.measurementStatus === 'READY'
  };
  const allGates = Object.values(gates).every(Boolean);
  return {
    caseId,
    gates,
    status: allGates ? 'READY_FOR_EFFECT_ESTIMATION' : 'BLOCKED_PENDING_EXECUTION_GATES',
    recommendation: null,
    effectEstimate: null,
    roi: null,
    historicalBoundary: HISTORICAL_BOUNDARY,
    historicalDecisionMutable: false
  };
}

function getPublicCase(caseId) {
  assertCase(caseId);
  return Object.freeze({ ...CASES[caseId], historicalBoundary: HISTORICAL_BOUNDARY });
}

module.exports = {
  CASES,
  HISTORICAL_BOUNDARY,
  normalizeObservation,
  summarizePublicData,
  evaluatePublicExecution,
  getPublicCase
};
