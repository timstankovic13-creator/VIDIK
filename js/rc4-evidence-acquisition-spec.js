'use strict';

const CASES = Object.freeze({
  '006': {
    name: 'ANCHOR', unit: 'eligible-call response exposure',
    target: 'Downstream police/emergency-service utilization and repeat demand attributable to marginal ANCHOR response exposure.',
    required: ['eligible-call universe', 'call timestamp/location', 'ANCHOR assignment/response timing', 'police involvement/dispatch outcome', 'repeat-call linkage', 'downstream emergency-service utilization', 'defensible comparator/design', 'eligibility/expansion history'],
    nonSufficient: ['program-wide call totals', 'aggregate handled-without-police rate']
  },
  '009': {
    name: 'Automated Speed Enforcement', unit: 'site-month enforcement exposure',
    target: 'Speed/safety outcomes attributable to marginal ASE enforcement exposure.',
    required: ['activation/deactivation and uptime', 'site/date speed observations', 'collision severity/site linkage', 'traffic exposure denominator', 'complete treatment history', 'concurrent intervention history'],
    nonSufficient: ['violations alone', 'camera locations alone', 'average speed alone']
  },
  '010': {
    name: 'Red-light cameras', unit: 'intersection-month camera exposure',
    target: 'Safety outcomes attributable to marginal intersection-month camera exposure.',
    required: ['camera activation/deactivation and operating status', 'treatment history', 'intersection/date violations', 'traffic exposure denominator', 'collision severity/site linkage', 'concurrent intervention history', 'untreated/pre-treatment comparison history'],
    nonSufficient: ['violation counts alone', 'camera locations alone']
  },
  '014': {
    name: 'Emergency shelter capacity', unit: 'bed-night exposure',
    target: 'Housing/shelter outcomes attributable to marginal additional bed-night exposure.',
    required: ['site/date bed inventory', 'capacity changes', 'occupancy/admissions', 'marginal bed-night exposure', 'exit outcome/follow-up', 'comparison or capacity-shock design', 'eligibility/placement changes', 'concurrent program changes'],
    nonSufficient: ['total beds alone', 'occupancy alone', 'annual shelter outcomes alone']
  }
});

function validateRequest(caseId, fields = []) {
  const spec = CASES[caseId];
  if (!spec) throw new Error(`Unknown RC4 acquisition case: ${caseId}`);
  const supplied = new Set(fields);
  const missing = spec.required.filter(field => !supplied.has(field));
  return Object.freeze({
    caseId,
    valid: missing.length === 0,
    missing: Object.freeze(missing),
    extraFields: Object.freeze(fields.filter(field => !spec.required.includes(field))),
    unit: spec.unit,
    target: spec.target
  });
}

function minimumRequest(caseId) {
  const spec = CASES[caseId];
  if (!spec) throw new Error(`Unknown RC4 acquisition case: ${caseId}`);
  return Object.freeze({ caseId, name: spec.name, unit: spec.unit, target: spec.target, fields: Object.freeze([...spec.required]) });
}

function buildAcquisitionSpec() {
  return Object.freeze(Object.keys(CASES).sort().map(minimumRequest));
}

module.exports = { CASES, validateRequest, minimumRequest, buildAcquisitionSpec };
