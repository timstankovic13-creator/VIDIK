'use strict';

const HISTORICAL_BOUNDARY = '2023-12-06';
const CHECKPOINTS = Object.freeze(['6mo', '1yr', '2yr', '5yr']);

const STREAMS = Object.freeze({
  '006': {
    name: 'ANCHOR',
    unit: 'eligible-call response exposure',
    mechanism: 'crisis-response substitution / de-escalation',
    primaryOutcome: 'police-involvement and downstream emergency-service utilization',
    publicSources: ['ANCHOR first-year memo/dashboard', 'ANCHOR formative/midterm evaluation'],
    requiredFields: ['call timestamp', 'location/geography', 'eligibility', 'dispatch/acceptance', 'response', 'disposition', 'police involvement', 'repeat-call linkage'],
    comparison: 'pre/post and/or comparable eligible calls/areas with defensible untreated exposure'
  },
  '009': {
    name: 'Automated Speed Enforcement',
    unit: 'site-month enforcement exposure',
    mechanism: 'speed reduction / compliance improvement',
    primaryOutcome: 'site-level fatal/major-injury collision risk',
    publicSources: ['ASE speed data', 'ASE removal monitoring', 'ASE locations/violations', 'traffic volumes', 'collision data'],
    requiredFields: ['activation/deactivation', 'uptime', 'enforcement-active exposure', 'traffic denominator', 'collision severity/site linkage', 'concurrent treatments'],
    comparison: 'interrupted time series / withdrawal contrast and/or eligible untreated sites with validated parallel trends'
  },
  '010': {
    name: 'Red Light Camera',
    unit: 'intersection-month camera exposure',
    mechanism: 'red-light compliance / reduced dangerous intersection conflicts',
    primaryOutcome: 'intersection-level collision severity outcomes',
    publicSources: ['RLC locations', 'RLC violations', 'traffic volumes', 'collision data'],
    requiredFields: ['activation/deactivation', 'uptime', 'violations', 'approach/intersection traffic', 'collision severity/site linkage', 'concurrent interventions'],
    comparison: 'eligible untreated intersections and/or defensible within-site treatment history'
  },
  '014': {
    name: 'Emergency Shelter Capacity',
    unit: 'site-night bed exposure',
    mechanism: 'increased shelter access / reduced unsheltered exposure',
    primaryOutcome: 'housing stability and serious-harm-relevant downstream outcomes',
    publicSources: ['monthly HIFIS', 'shelter dashboard', 'housing outcomes', 'capacity/progress reports'],
    requiredFields: ['beds by site/date', 'bed additions/removals', 'occupancy', 'admissions', 'nights', 'exit destination', 'repeat shelter use'],
    comparison: 'comparable demand periods/sites or defensible capacity shock design'
  }
});

function assertStream(caseId) {
  if (!STREAMS[caseId]) throw new Error(`Unknown RC4 stream: ${caseId}`);
}

function createPreregis(caseId, overrides = {}) {
  assertStream(caseId);
  const s = STREAMS[caseId];
  return Object.freeze({
    schema: 'RC4_PREREGISTRATION_1.0', caseId, historicalBoundary: HISTORICAL_BOUNDARY,
    intervention: s.name, marginalResourceUnit: s.unit, mechanism: s.mechanism,
    primaryOutcome: s.primaryOutcome, baseline: overrides.baseline ?? 'STATUS_QUO_REQUIRED',
    counterfactual: overrides.counterfactual ?? s.comparison,
    alternatives: overrides.alternatives ?? [],
    successThreshold: overrides.successThreshold ?? null,
    failureThreshold: overrides.failureThreshold ?? null,
    measurementPlan: overrides.measurementPlan ?? s.requiredFields,
    spilloverControls: overrides.spilloverControls ?? ['geographic spillover', 'displacement', 'concurrent interventions'],
    stopRule: overrides.stopRule ?? 'REVIEW_AT_CHECKPOINT; STOP_OR_ROLLBACK_IF_PRE-REGISTERED_FAILURE_THRESHOLD_MET',
    checkpoints: CHECKPOINTS,
    frozen: true,
    historicalDecisionMutable: false
  });
}

function normalizeRecord(caseId, row = {}) {
  assertStream(caseId);
  const value = k => row[k] ?? null;
  return Object.freeze({
    caseId, timestamp: value('timestamp') ?? value('date'), geography: value('geography') ?? value('location'),
    exposure: value('exposure'), outcome: value('outcome'), severity: value('severity'),
    comparator: value('comparator'), concurrentInterventions: value('concurrentInterventions'), provenance: value('provenance')
  });
}

function gateStream(caseId, input = {}) {
  assertStream(caseId);
  const gates = {
    preregistrationFrozen: input.preregistrationFrozen === true,
    authorizedAllocation: input.authorizedAllocation === true,
    actualExposure: input.actualExposure === true,
    admissibleEvidence: input.admissibleEvidence === true,
    defensibleCounterfactual: input.defensibleCounterfactual === true,
    measurementReady: input.measurementReady === true
  };
  const ready = Object.values(gates).every(Boolean);
  return Object.freeze({
    caseId, gates, status: ready ? 'READY_FOR_EFFECT_ESTIMATION' : 'BLOCKED_PENDING_EXECUTION_GATES',
    effectEstimate: null, roi: null, recommendation: null,
    historicalBoundary: HISTORICAL_BOUNDARY, historicalDecisionMutable: false
  });
}

function batchGate(inputs = {}) {
  return Object.freeze(Object.keys(STREAMS).sort().map(caseId => gateStream(caseId, inputs[caseId] ?? {})));
}

module.exports = { HISTORICAL_BOUNDARY, CHECKPOINTS, STREAMS, createPreregis, normalizeRecord, gateStream, batchGate };
