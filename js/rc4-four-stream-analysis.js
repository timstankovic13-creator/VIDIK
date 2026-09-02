'use strict';

const { HISTORICAL_BOUNDARY, STREAMS } = require('./rc4-four-stream-execution');

const LEVELS = Object.freeze({
  DESCRIPTIVE: 'DESCRIPTIVE',
  DECISION_SUPPORT: 'DECISION_SUPPORT',
  EFFECT_ESTIMATION: 'EFFECT_ESTIMATION'
});

function analyzeStream(caseId, input = {}) {
  if (!STREAMS[caseId]) throw new Error(`Unknown RC4 stream: ${caseId}`);

  const fields = input.fieldsPresent instanceof Set
    ? input.fieldsPresent
    : new Set(Array.isArray(input.fieldsPresent) ? input.fieldsPresent : []);

  const has = name => fields.has(name);
  const temporalClean = input.temporalClean === true;
  const provenance = input.provenance === true;
  const baseline = input.baseline === true;
  const exposure = input.actualExposure === true;
  const allocation = input.authorizedAllocation === true;
  const outcome = input.outcomeMeasure === true;
  const comparator = input.defensibleCounterfactual === true;
  const measurement = input.measurementReady === true;
  const causal = input.admissibleEvidence === true && comparator;

  // Evidence burden scales with the claim. A descriptive answer must not be
  // held to the evidentiary burden required for a causal effect estimate.
  const descriptiveReady = provenance && temporalClean && fields.size > 0;
  const decisionSupportReady = descriptiveReady && baseline && exposure && outcome;
  const effectReady = decisionSupportReady && allocation && causal && measurement;

  let level = LEVELS.DESCRIPTIVE;
  if (effectReady) level = LEVELS.EFFECT_ESTIMATION;
  else if (decisionSupportReady) level = LEVELS.DECISION_SUPPORT;

  const missingFor = required => required.filter(field => !has(field));
  const stream = STREAMS[caseId];
  const missingMeasurementFields = missingFor(stream.requiredFields);

  return Object.freeze({
    caseId,
    intervention: stream.name,
    historicalBoundary: HISTORICAL_BOUNDARY,
    level,
    descriptiveReady,
    decisionSupportReady,
    effectEstimationReady: effectReady,
    recommendationStatus: effectReady ? 'ELIGIBLE_FOR_EFFECT_ESTIMATION' : 'NO_RECOMMENDATION',
    effectEstimate: null,
    roi: null,
    recommendation: null,
    missingMeasurementFields,
    burdenEscalatesWithClaim: true,
    historicalDecisionMutable: false
  });
}

function summarizeBatch(inputs = {}) {
  return Object.freeze(Object.keys(STREAMS).sort().map(caseId => analyzeStream(caseId, inputs[caseId] || {})));
}

module.exports = { LEVELS, analyzeStream, summarizeBatch };
