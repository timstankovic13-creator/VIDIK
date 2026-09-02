'use strict';

const HISTORICAL_BOUNDARY = '2023-12-06';
const CHECKPOINTS = Object.freeze(['6mo', '1yr', '2yr', '5yr']);

const CASES = Object.freeze({
  '003': { outcome: 'BLOCKED', missing: ['actual marginal crew-hour exposure', 'defensible counterfactual'] },
  '004': { outcome: 'BLOCKED', missing: ['actual marginal officer-hour exposure', 'defensible counterfactual'] },
  '005': { outcome: 'BLOCKED', missing: ['actual marginal deployment exposure', 'defensible counterfactual'] },
  '006': { outcome: 'BLOCKED', missing: ['call-level exposure linkage', 'defensible counterfactual'] },
  '007': { outcome: 'BLOCKED', missing: ['marginal outreach-hour exposure', 'defensible counterfactual'] },
  '008': { outcome: 'BLOCKED', missing: ['participant-level exposure linkage', 'defensible counterfactual'] },
  '009': { outcome: 'BLOCKED', missing: ['treatment-level marginal exposure', 'defensible comparison'] },
  '010': { outcome: 'BLOCKED', missing: ['site-level exposure variation', 'untreated comparison'] },
  '011': { outcome: 'BLOCKED', missing: ['marginal response-hour exposure', 'incident-level comparison'] },
  '012': { outcome: 'BLOCKED', missing: ['patient-level exposure linkage', 'defensible comparator'] },
  '013': { outcome: 'BLOCKED', missing: ['camera-equipped officer-hours', 'untreated comparison units'] },
  '014': { outcome: 'BLOCKED', missing: ['marginal bed-night exposure', 'downstream causal attribution'] }
});

function closeout() {
  const cases = Object.entries(CASES).map(([caseId, value]) => ({
    caseId,
    ...value,
    effectEstimate: null,
    roi: null,
    recommendation: null,
    historicalBoundary: HISTORICAL_BOUNDARY,
    checkpoints: CHECKPOINTS
  }));
  return Object.freeze({
    status: 'EXPERIMENT_CLOSED_AT_PUBLIC_ACQUISITION_BOUNDARY',
    totalCases: cases.length,
    promoted: cases.filter(c => c.outcome === 'PROMOTED').length,
    blocked: cases.filter(c => c.outcome === 'BLOCKED').length,
    inconclusive: cases.filter(c => c.outcome === 'INCONCLUSIVE').length,
    recommendations: cases.filter(c => c.recommendation !== null).length,
    cases
  });
}

module.exports = { HISTORICAL_BOUNDARY, CHECKPOINTS, CASES, closeout };
