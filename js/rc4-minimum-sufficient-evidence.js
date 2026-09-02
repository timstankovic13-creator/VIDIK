'use strict';

const CLAIMS = Object.freeze({
  DESCRIPTIVE: 'DESCRIPTIVE',
  DECISION_SUPPORT: 'DECISION_SUPPORT',
  EFFECT_ESTIMATION: 'EFFECT_ESTIMATION'
});

const ACQUISITION = Object.freeze({
  PUBLIC_AVAILABLE: 'PUBLIC_AVAILABLE',
  PUBLIC_GAP: 'PUBLIC_GAP',
  MUNICIPAL_REQUEST: 'MUNICIPAL_REQUEST',
  NOT_MATERIAL: 'NOT_MATERIAL'
});

const MSE = Object.freeze({
  '006': {
    descriptive: ['call timestamp', 'location/geography', 'dispatch/acceptance', 'response', 'disposition'],
    decision: ['eligibility', 'police involvement'],
    causal: ['repeat-call linkage'],
    optional: ['downstream emergency-service utilization']
  },
  '009': {
    descriptive: ['Date', 'Location', 'AvgSpeed', 'Pct85th', 'PctCompliance'],
    decision: ['activation/deactivation', 'uptime'],
    causal: ['approach/intersection traffic', 'collision severity/site linkage', 'concurrent interventions'],
    optional: ['violations']
  },
  '010': {
    descriptive: ['intersection/date', 'violations'],
    decision: ['camera operating status', 'treatment history'],
    causal: ['approach/intersection traffic', 'collision severity/site linkage', 'concurrent interventions'],
    optional: []
  },
  '014': {
    descriptive: ['beds by site/date', 'occupancy', 'admissions', 'nights'],
    decision: ['exit destination'],
    causal: ['marginal bed exposure', 'comparable demand periods/sites or capacity shock'],
    optional: ['repeat use']
  }
});

function requirements(caseId, claim) {
  const spec = MSE[caseId];
  if (!spec) throw new Error(`Unknown RC4 MSE stream: ${caseId}`);
  if (claim === CLAIMS.DESCRIPTIVE) return spec.descriptive;
  if (claim === CLAIMS.DECISION_SUPPORT) return [...spec.descriptive, ...spec.decision];
  if (claim === CLAIMS.EFFECT_ESTIMATION) return [...spec.descriptive, ...spec.decision, ...spec.causal];
  throw new Error(`Unknown claim level: ${claim}`);
}

function evaluateMSE(caseId, input = {}) {
  const spec = MSE[caseId];
  if (!spec) throw new Error(`Unknown RC4 MSE stream: ${caseId}`);
  const present = input.fieldsPresent instanceof Set
    ? input.fieldsPresent
    : new Set(Array.isArray(input.fieldsPresent) ? input.fieldsPresent : []);
  const publicAvailable = new Set(Array.isArray(input.publicAvailable) ? input.publicAvailable : []);
  const municipalOnly = new Set(Array.isArray(input.municipalOnly) ? input.municipalOnly : []);
  const materiality = input.materiality && typeof input.materiality === 'object' ? input.materiality : {};

  const classify = field => {
    if (present.has(field)) return 'PRESENT';
    if (materiality[field] === false) return 'NOT_MATERIAL';
    if (publicAvailable.has(field)) return ACQUISITION.PUBLIC_AVAILABLE;
    if (municipalOnly.has(field)) return ACQUISITION.MUNICIPAL_REQUEST;
    return ACQUISITION.PUBLIC_GAP;
  };

  const missing = level => requirements(caseId, level).filter(field => !present.has(field));
  const classifyMissing = level => missing(level).map(field => Object.freeze({
    field,
    acquisition: classify(field),
    decisionCritical: level !== CLAIMS.DESCRIPTIVE,
    material: materiality[field] !== false
  }));

  const descriptiveMissing = missing(CLAIMS.DESCRIPTIVE);
  const decisionMissing = missing(CLAIMS.DECISION_SUPPORT);
  const effectMissing = missing(CLAIMS.EFFECT_ESTIMATION);
  const materialEffectMissing = effectMissing.filter(field => materiality[field] !== false);

  const descriptiveReady = descriptiveMissing.every(field => materiality[field] === false || present.has(field));
  const decisionSupportReady = descriptiveReady && decisionMissing.every(field => materiality[field] === false || present.has(field));
  const effectEvidenceReady = decisionSupportReady && materialEffectMissing.length === 0;

  const acquisitionPlan = Object.freeze([
    ...classifyMissing(CLAIMS.DESCRIPTIVE),
    ...classifyMissing(CLAIMS.DECISION_SUPPORT).filter(x => !descriptiveMissing.includes(x.field)),
    ...classifyMissing(CLAIMS.EFFECT_ESTIMATION).filter(x => !decisionMissing.includes(x.field))
  ]);

  return Object.freeze({
    caseId,
    minimumSufficientEvidence: Object.freeze({
      descriptive: Object.freeze([...spec.descriptive]),
      decisionSupport: Object.freeze([...requirements(caseId, CLAIMS.DECISION_SUPPORT)]),
      effectEstimation: Object.freeze([...requirements(caseId, CLAIMS.EFFECT_ESTIMATION)])
    }),
    descriptiveReady,
    decisionSupportReady,
    effectEvidenceReady,
    missingDescriptive: Object.freeze(descriptiveMissing.filter(f => materiality[f] !== false)),
    missingDecisionSupport: Object.freeze(decisionMissing.filter(f => materiality[f] !== false)),
    missingEffectEvidence: Object.freeze(effectMissing.filter(f => materiality[f] !== false)),
    acquisitionPlan,
    stopRule: materialEffectMissing.length === 0 ? 'STOP_ACQUISITION_NO_MATERIAL_EFFECT_GAPS' : 'ACQUIRE_ONLY_MATERIAL_EFFECT_GAPS',
    noRecommendationFromMSEAlone: true
  });
}

function evaluateBatch(inputs = {}) {
  return Object.freeze(Object.keys(MSE).sort().map(caseId => evaluateMSE(caseId, inputs[caseId] || {})));
}

module.exports = { CLAIMS, ACQUISITION, MSE, requirements, evaluateMSE, evaluateBatch };
