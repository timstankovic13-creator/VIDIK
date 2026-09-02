'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { CLAIMS, ACQUISITION, evaluateMSE, evaluateBatch } = require('../js/rc4-minimum-sufficient-evidence');

const public009 = ['Date', 'Location', 'AvgSpeed', 'Pct85th', 'PctCompliance', 'activation/deactivation', 'uptime'];

test('MSE does not require causal fields for descriptive ASE output', () => {
  const r = evaluateMSE('009', { fieldsPresent: public009 });
  assert.equal(r.descriptiveReady, true);
  assert.equal(r.decisionSupportReady, true);
  assert.equal(r.effectEvidenceReady, false);
  assert.equal(r.stopRule, 'ACQUIRE_ONLY_MATERIAL_EFFECT_GAPS');
});

test('MSE identifies only the causal ASE gaps rather than demanding unrelated data', () => {
  const r = evaluateMSE('009', { fieldsPresent: public009 });
  assert.deepEqual(r.missingEffectEvidence, [
    'approach/intersection traffic',
    'collision severity/site linkage',
    'concurrent interventions'
  ]);
  assert.ok(r.acquisitionPlan.some(x => x.field === 'collision severity/site linkage'));
});

test('municipal-only data are acquisition targets, not permission to weaken the claim', () => {
  const r = evaluateMSE('006', {
    fieldsPresent: ['first-year calls', 'dispatched to ANCHOR', 'handled without police', 'expansion date', 'eligible-call response exposure'],
    municipalOnly: ['police involvement']
  });
  const police = r.acquisitionPlan.find(x => x.field === 'police involvement');
  assert.equal(police.acquisition, ACQUISITION.MUNICIPAL_REQUEST);
  assert.equal(police.decisionCritical, true);
  assert.equal(r.decisionSupportReady, false);
  assert.equal(r.noRecommendationFromMSEAlone, true);
});

test('materiality can stop unnecessary acquisition without promoting an effect claim', () => {
  const r = evaluateMSE('014', {
    fieldsPresent: ['beds by site/date', 'occupancy', 'admissions', 'nights', 'exit destination'],
    materiality: {
      'repeat use': false,
      'marginal bed exposure': false,
      'comparable demand periods/sites or capacity shock': false
    }
  });
  assert.equal(r.effectEvidenceReady, true);
  assert.equal(r.stopRule, 'STOP_ACQUISITION_NO_MATERIAL_EFFECT_GAPS');
  assert.equal(r.noRecommendationFromMSEAlone, true);
});

test('materiality never turns missing descriptive evidence into fabricated evidence', () => {
  const r = evaluateMSE('010', { materiality: { 'intersection/date': false } });
  assert.equal(r.descriptiveReady, false);
  assert.ok(r.missingDescriptive.includes('violations'));
});

test('batch evaluation stays claim-scaled and conservative', () => {
  const results = evaluateBatch({});
  assert.deepEqual(results.map(r => r.caseId), ['006', '009', '010', '014']);
  for (const r of results) {
    assert.equal(r.noRecommendationFromMSEAlone, true);
    assert.equal(r.descriptiveReady, false);
    assert.equal(r.effectEvidenceReady, false);
  }
});

test('requirements are explicitly claim-scaled', () => {
  const r = evaluateMSE('010', { fieldsPresent: [] });
  assert.equal(r.minimumSufficientEvidence.descriptive.length < r.minimumSufficientEvidence.effectEstimation.length, true);
  assert.ok(r.minimumSufficientEvidence.effectEstimation.includes('concurrent interventions'));
  assert.equal(CLAIMS.EFFECT_ESTIMATION, 'EFFECT_ESTIMATION');
});
