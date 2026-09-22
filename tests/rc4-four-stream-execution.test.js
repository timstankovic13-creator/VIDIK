const assert = require('assert');
const { HISTORICAL_BOUNDARY, CHECKPOINTS, STREAMS, createPreregis, normalizeRecord, gateStream, batchGate } = require('../js/rc4-four-stream-execution');

assert.deepStrictEqual(Object.keys(STREAMS).sort(), ['006','009','010','014']);
assert.deepStrictEqual(CHECKPOINTS, ['6mo','1yr','2yr','5yr']);

for (const caseId of Object.keys(STREAMS)) {
  const p = createPreregis(caseId);
  assert.strictEqual(p.frozen, true);
  assert.strictEqual(p.historicalBoundary, HISTORICAL_BOUNDARY);
  assert.strictEqual(p.historicalDecisionMutable, false);
  assert.ok(p.marginalResourceUnit);
  assert.ok(p.primaryOutcome);
  assert.ok(p.measurementPlan.length >= 4);

  const n = normalizeRecord(caseId, { date: '2026-01-01', location: 'site-a', exposure: 1, outcome: 2, severity: 'major', provenance: 'public-source' });
  assert.strictEqual(n.geography, 'site-a');
  assert.strictEqual(n.exposure, 1);

  const blocked = gateStream(caseId, { preregistrationFrozen: true });
  assert.strictEqual(blocked.status, 'BLOCKED_PENDING_EXECUTION_GATES');
  assert.strictEqual(blocked.effectEstimate, null);
  assert.strictEqual(blocked.roi, null);
  assert.strictEqual(blocked.recommendation, null);

  const ready = gateStream(caseId, {
    preregistrationFrozen: true, authorizedAllocation: true, actualExposure: true,
    admissibleEvidence: true, defensibleCounterfactual: true, measurementReady: true
  });
  assert.strictEqual(ready.status, 'READY_FOR_EFFECT_ESTIMATION');
  assert.strictEqual(ready.effectEstimate, null);
  assert.strictEqual(ready.recommendation, null);
}

const allBlocked = batchGate({
  '006': { preregistrationFrozen: true }, '009': { preregistrationFrozen: true },
  '010': { preregistrationFrozen: true }, '014': { preregistrationFrozen: true }
});
assert.strictEqual(allBlocked.length, 4);
assert.ok(allBlocked.every(x => x.status === 'BLOCKED_PENDING_EXECUTION_GATES'));
console.log('RC4 four-stream execution contracts: PASS');
