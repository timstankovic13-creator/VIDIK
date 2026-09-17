const assert = require('assert');
const {
  CASES,
  HISTORICAL_BOUNDARY,
  normalizeObservation,
  summarizePublicData,
  evaluatePublicExecution,
  getPublicCase
} = require('../js/rc3-public-data-execution-009-010');

for (const caseId of ['009', '010']) {
  const meta = getPublicCase(caseId);
  assert.strictEqual(meta.historicalBoundary, HISTORICAL_BOUNDARY);
  assert.ok(meta.publicEndpointFamilies.length >= 4);

  const sample = normalizeObservation({
    Location: 'sample',
    Date: '2024-01',
    PctCompliance: '57',
    PctHighEndSpeeders: 4,
    collisionCount: 3,
    trafficVolume: 12000
  });
  assert.strictEqual(sample.compliance, 57);
  assert.strictEqual(sample.collisionCount, 3);
  assert.strictEqual(sample.trafficVolume, 12000);

  const summary = summarizePublicData(caseId, [sample], {
    sourceRetrievedAt: '2026-09-02',
    sourceVersions: meta.publicEndpointFamilies
  });
  assert.strictEqual(summary.publicDataStatus, 'LOCATED_AND_INGESTED');
  assert.strictEqual(summary.usableExposureRows, 1);
  assert.strictEqual(summary.outcomeRows, 1);
  assert.strictEqual(summary.trafficExposureRows, 1);

  const blocked = evaluatePublicExecution(caseId, summary);
  assert.strictEqual(blocked.status, 'BLOCKED_PENDING_EXECUTION_GATES');
  assert.strictEqual(blocked.recommendation, null);
  assert.strictEqual(blocked.effectEstimate, null);
  assert.strictEqual(blocked.historicalDecisionMutable, false);

  const ready = evaluatePublicExecution(caseId, summarizePublicData(caseId, [sample], {
    authorizedMarginalExposure: true,
    defensibleCounterfactual: true,
    measurementReady: true
  }));
  assert.strictEqual(ready.status, 'READY_FOR_EFFECT_ESTIMATION');
  assert.strictEqual(ready.recommendation, null);
  assert.strictEqual(ready.effectEstimate, null);
}

assert.deepStrictEqual(Object.keys(CASES).sort(), ['009', '010']);
console.log('RC3 public-data execution 009-010: PASS');
