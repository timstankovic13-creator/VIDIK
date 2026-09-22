'use strict';

const HISTORICAL_BOUNDARY = '2023-12-06';
const CHECKPOINTS = Object.freeze(['6mo', '1yr', '2yr', '5yr']);

// This is an acquisition result, not an effect estimate. Public evidence can
// establish that a program/intervention occurred, but promotion requires the
// actual authorized marginal exposure plus a defensible counterfactual and
// measurement linkage. No missing execution data is inferred.
const ENDPOINT_AUDIT = Object.freeze({
  '004': { status: 'BLOCKED', evidence: 'PUBLIC_EVIDENCE_LOCATED', exposure: 'UNVERIFIED', counterfactual: 'UNVERIFIED', measurement: 'UNVERIFIED' },
  '005': { status: 'BLOCKED', evidence: 'PUBLIC_EVIDENCE_LOCATED', exposure: 'UNVERIFIED', counterfactual: 'UNVERIFIED', measurement: 'UNVERIFIED' },
  '006': { status: 'BLOCKED', evidence: 'PUBLIC_EVIDENCE_LOCATED', exposure: 'UNVERIFIED', counterfactual: 'UNVERIFIED', measurement: 'UNVERIFIED' },
  '007': { status: 'BLOCKED', evidence: 'PUBLIC_EVIDENCE_LOCATED', exposure: 'UNVERIFIED', counterfactual: 'UNVERIFIED', measurement: 'UNVERIFIED' },
  '008': { status: 'BLOCKED', evidence: 'PUBLIC_EVIDENCE_LOCATED', exposure: 'UNVERIFIED', counterfactual: 'UNVERIFIED', measurement: 'UNVERIFIED' },
  '009': { status: 'BLOCKED', evidence: 'PUBLIC_EVIDENCE_LOCATED', exposure: 'UNVERIFIED', counterfactual: 'UNVERIFIED', measurement: 'UNVERIFIED' },
  '010': { status: 'BLOCKED', evidence: 'PUBLIC_EVIDENCE_LOCATED', exposure: 'UNVERIFIED', counterfactual: 'UNVERIFIED', measurement: 'UNVERIFIED' },
  '011': { status: 'BLOCKED', evidence: 'PUBLIC_EVIDENCE_LOCATED', exposure: 'UNVERIFIED', counterfactual: 'UNVERIFIED', measurement: 'UNVERIFIED' },
  '012': { status: 'BLOCKED', evidence: 'PUBLIC_EVIDENCE_LOCATED', exposure: 'UNVERIFIED', counterfactual: 'UNVERIFIED', measurement: 'UNVERIFIED' },
  '013': { status: 'BLOCKED', evidence: 'PUBLIC_EVIDENCE_LOCATED', exposure: 'UNVERIFIED', counterfactual: 'UNVERIFIED', measurement: 'UNVERIFIED' },
  '014': { status: 'BLOCKED', evidence: 'PUBLIC_EVIDENCE_LOCATED', exposure: 'UNVERIFIED', counterfactual: 'UNVERIFIED', measurement: 'UNVERIFIED' }
});

for (const item of Object.values(ENDPOINT_AUDIT)) Object.freeze(item);

function getEndpointAudit(caseId) {
  if (!ENDPOINT_AUDIT[caseId]) throw new Error(`Unsupported endpoint audit case: ${caseId}`);
  return Object.freeze({
    caseId,
    ...ENDPOINT_AUDIT[caseId],
    historicalBoundary: HISTORICAL_BOUNDARY,
    checkpoints: CHECKPOINTS,
    effectEstimate: null,
    roi: null,
    recommendation: null
  });
}

function summarizeEndpointAudit() {
  const cases = Object.keys(ENDPOINT_AUDIT).map(getEndpointAudit);
  return Object.freeze({
    total: cases.length,
    blocked: cases.filter(c => c.status === 'BLOCKED').length,
    readyForEffectEstimation: cases.filter(c => c.status === 'READY_FOR_EFFECT_ESTIMATION').length,
    inconclusive: cases.filter(c => c.status === 'INCONCLUSIVE').length,
    recommendations: cases.filter(c => c.recommendation !== null).length,
    cases
  });
}

module.exports = { ENDPOINT_AUDIT, HISTORICAL_BOUNDARY, CHECKPOINTS, getEndpointAudit, summarizeEndpointAudit };
