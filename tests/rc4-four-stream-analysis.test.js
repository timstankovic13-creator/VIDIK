'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { LEVELS, analyzeStream, summarizeBatch } = require('../js/rc4-four-stream-analysis');

test('descriptive analysis can proceed without causal-grade evidence', () => {
  const result = analyzeStream('009', {
    provenance: true,
    temporalClean: true,
    fieldsPresent: ['Date', 'Location', 'AvgSpeed']
  });
  assert.equal(result.level, LEVELS.DESCRIPTIVE);
  assert.equal(result.descriptiveReady, true);
  assert.equal(result.effectEstimationReady, false);
  assert.equal(result.recommendationStatus, 'NO_RECOMMENDATION');
});

test('decision support requires baseline, exposure and outcome but not yet a causal estimate', () => {
  const result = analyzeStream('009', {
    provenance: true,
    temporalClean: true,
    fieldsPresent: ['Date', 'Location', 'AvgSpeed'],
    baseline: true,
    actualExposure: true,
    outcomeMeasure: true
  });
  assert.equal(result.level, LEVELS.DECISION_SUPPORT);
  assert.equal(result.decisionSupportReady, true);
  assert.equal(result.effectEstimationReady, false);
  assert.equal(result.effectEstimate, null);
});

test('effect estimation requires the full causal and execution gate', () => {
  const result = analyzeStream('010', {
    provenance: true,
    temporalClean: true,
    fieldsPresent: ['activation/deactivation', 'uptime', 'violations', 'approach/intersection traffic', 'collision severity/site linkage', 'concurrent interventions'],
    baseline: true,
    actualExposure: true,
    outcomeMeasure: true,
    preregistrationFrozen: true,
    authorizedAllocation: true,
    admissibleEvidence: true,
    defensibleCounterfactual: true,
    measurementReady: true
  });
  assert.equal(result.level, LEVELS.EFFECT_ESTIMATION);
  assert.equal(result.effectEstimationReady, true);
  assert.equal(result.recommendationStatus, 'ELIGIBLE_FOR_EFFECT_ESTIMATION');
  assert.equal(result.recommendation, null);
});

test('missing preregistration prevents effect estimation', () => {
  const result = analyzeStream('006', {
    provenance: true,
    temporalClean: true,
    fieldsPresent: ['call timestamp'],
    baseline: true,
    actualExposure: true,
    outcomeMeasure: true,
    authorizedAllocation: true,
    admissibleEvidence: true,
    defensibleCounterfactual: true,
    measurementReady: true
  });
  assert.equal(result.effectEstimationReady, false);
  assert.equal(result.recommendationStatus, 'NO_RECOMMENDATION');
});

test('batch remains conservative: empty inputs do not create recommendations', () => {
  const results = summarizeBatch({});
  assert.deepEqual(results.map(r => r.caseId), ['006', '009', '010', '014']);
  for (const result of results) {
    assert.equal(result.level, LEVELS.DESCRIPTIVE);
    assert.equal(result.recommendationStatus, 'NO_RECOMMENDATION');
    assert.equal(result.effectEstimate, null);
    assert.equal(result.roi, null);
    assert.equal(result.recommendation, null);
    assert.equal(result.historicalBoundary, '2023-12-06');
    assert.equal(result.historicalDecisionMutable, false);
  }
});

test('missing fields are exposed instead of silently weakening the claim', () => {
  const result = analyzeStream('014', {
    provenance: true,
    temporalClean: true,
    fieldsPresent: ['beds by site/date', 'occupancy']
  });
  assert.ok(result.missingMeasurementFields.includes('admissions'));
  assert.ok(result.missingMeasurementFields.includes('exit destination'));
});
