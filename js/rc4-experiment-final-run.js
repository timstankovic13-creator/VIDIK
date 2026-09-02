'use strict';

const { evaluateMSE } = require('./rc4-minimum-sufficient-evidence');
const { analyzeStream } = require('./rc4-four-stream-analysis');

const HISTORICAL_BOUNDARY = '2023-12-06';

const SNAPSHOTS = Object.freeze({
  '006': {
    fieldsPresent: ['first-year calls', 'dispatched to ANCHOR', 'handled without police', 'expansion date'],
    provenance: true, temporalClean: true, baseline: true, actualExposure: false, authorizedAllocation: false,
    outcomeMeasure: false, defensibleCounterfactual: false, measurementReady: false, preregistrationFrozen: true,
    municipalOnly: ['police involvement', 'repeat-call linkage']
  },
  '009': {
    fieldsPresent: ['Date', 'Location', 'AvgSpeed', 'Pct85th', 'PctCompliance', 'activation/deactivation', 'uptime', 'violations'],
    provenance: true, temporalClean: true, baseline: true, actualExposure: true, authorizedAllocation: false,
    outcomeMeasure: true, defensibleCounterfactual: false, measurementReady: false, preregistrationFrozen: true,
    municipalOnly: ['approach/intersection traffic', 'collision severity/site linkage', 'concurrent interventions']
  },
  '010': {
    fieldsPresent: ['intersection/date', 'violations', 'camera operating status', 'treatment history'],
    provenance: true, temporalClean: true, baseline: true, actualExposure: true, authorizedAllocation: false,
    outcomeMeasure: true, defensibleCounterfactual: false, measurementReady: false, preregistrationFrozen: true,
    municipalOnly: ['approach/intersection traffic', 'collision severity/site linkage', 'concurrent interventions']
  },
  '014': {
    fieldsPresent: ['beds by site/date', 'occupancy', 'admissions', 'nights', 'exit destination'],
    provenance: true, temporalClean: true, baseline: true, actualExposure: true, authorizedAllocation: false,
    outcomeMeasure: true, defensibleCounterfactual: false, measurementReady: false, preregistrationFrozen: true,
    municipalOnly: ['marginal bed exposure', 'comparable demand periods/sites or capacity shock']
  }
});

function runCase(caseId, input = SNAPSHOTS[caseId]) {
  const mse = evaluateMSE(caseId, input);
  const analysis = analyzeStream(caseId, input);
  return Object.freeze({
    caseId,
    historicalBoundary: HISTORICAL_BOUNDARY,
    highestDefensibleClaim: analysis.level,
    descriptiveReady: analysis.descriptiveReady,
    decisionSupportReady: analysis.decisionSupportReady,
    effectEstimationReady: analysis.effectEstimationReady && mse.effectEvidenceReady,
    materialGaps: mse.acquisitionPlan.filter(x => x.acquisition !== 'NOT_MATERIAL' && !input.fieldsPresent.includes(x.field)),
    stopRule: mse.stopRule,
    recommendationStatus: 'NO_RECOMMENDATION',
    effectEstimate: null,
    roi: null,
    recommendation: null,
    historicalDecisionMutable: false
  });
}

function runExperiment(inputs = SNAPSHOTS) {
  const cases = Object.freeze(Object.keys(SNAPSHOTS).sort().map(id => runCase(id, inputs[id])));
  return Object.freeze({
    experiment: 'RC4_FOUR_STREAM_END_TO_END',
    historicalBoundary: HISTORICAL_BOUNDARY,
    cases,
    counts: Object.freeze({
      total: cases.length,
      descriptive: cases.filter(x => x.descriptiveReady).length,
      decisionSupport: cases.filter(x => x.decisionSupportReady).length,
      effectEligible: cases.filter(x => x.effectEstimationReady).length,
      recommendations: cases.filter(x => x.recommendationStatus !== 'NO_RECOMMENDATION').length
    }),
    failClosed: true
  });
}

module.exports = { HISTORICAL_BOUNDARY, SNAPSHOTS, runCase, runExperiment };
