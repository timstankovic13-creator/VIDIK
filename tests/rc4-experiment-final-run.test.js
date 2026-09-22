'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { runCase, runExperiment, SNAPSHOTS, HISTORICAL_BOUNDARY } = require('../js/rc4-experiment-final-run');

test('RC4 end-to-end run evaluates all four streams', () => {
  const result = runExperiment();
  assert.equal(result.experiment, 'RC4_FOUR_STREAM_END_TO_END');
  assert.equal(result.historicalBoundary, HISTORICAL_BOUNDARY);
  assert.deepEqual(result.cases.map(x => x.caseId), ['006', '009', '010', '014']);
  assert.equal(result.counts.total, 4);
  assert.equal(result.failClosed, true);
});

test('public evidence reaches useful claim levels without causal promotion', () => {
  const result = runExperiment();
  assert.equal(result.counts.descriptive, 4);
  assert.equal(result.counts.decisionSupport, 3);
  assert.equal(result.counts.effectEligible, 0);
  assert.equal(result.counts.recommendations, 0);
  for (const item of result.cases) {
    assert.equal(item.effectEstimate, null);
    assert.equal(item.roi, null);
    assert.equal(item.recommendation, null);
    assert.equal(item.historicalDecisionMutable, false);
  }
});

test('009 retains a narrow causal acquisition boundary', () => {
  const r = runCase('009', SNAPSHOTS['009']);
  assert.equal(r.decisionSupportReady, true);
  assert.equal(r.effectEstimationReady, false);
  assert.ok(r.materialGaps.some(x => x.field === 'concurrent interventions'));
  assert.equal(r.recommendationStatus, 'NO_RECOMMENDATION');
});

test('006 does not treat program-wide call volume as actual marginal exposure', () => {
  const r = runCase('006', SNAPSHOTS['006']);
  assert.equal(r.descriptiveReady, true);
  assert.equal(r.decisionSupportReady, false);
  assert.equal(r.effectEstimationReady, false);
  assert.ok(r.materialGaps.some(x => x.field === 'eligible-call response exposure'));
});

test('014 cannot promote from aggregate shelter capacity alone', () => {
  const r = runCase('014', SNAPSHOTS['014']);
  assert.equal(r.decisionSupportReady, true);
  assert.equal(r.effectEstimationReady, false);
  assert.ok(r.materialGaps.some(x => x.field === 'marginal bed exposure'));
  assert.ok(r.materialGaps.some(x => x.field === 'comparable demand periods/sites or capacity shock'));
});
