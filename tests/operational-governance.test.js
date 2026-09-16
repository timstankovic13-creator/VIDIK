'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createOperationalGovernanceStore } = require('../scripts/operational-governance');

function tempFile() { return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vidik-governance-')), 'governance.json'); }

test('review lifecycle schedules, becomes overdue, and completes', () => {
  const filePath = tempFile();
  const store = createOperationalGovernanceStore({ filePath });
  const review = store.scheduleReview({ decisionId: 'd-1', checkpoint: '6-month', decisionAt: '2026-01-01T00:00:00Z' });
  assert.equal(store.reviewStatus('d-1', '2026-08-01T00:00:00Z')[0].effectiveStatus, 'OVERDUE');
  assert.equal(store.completeReview(review.id, { finding: 'reviewed', reviewedAt: '2026-08-02T00:00:00Z' }).status, 'COMPLETED');
  assert.equal(store.reviewStatus('d-1', '2026-08-03T00:00:00Z')[0].effectiveStatus, 'COMPLETED');
});

test('recalibration requires explicit human decision state', () => {
  const filePath = tempFile();
  const store = createOperationalGovernanceStore({ filePath });
  const proposal = store.proposeRecalibration({ decisionId: 'd-2', parameterName: 'effect', proposedValue: 12 });
  assert.equal(proposal.status, 'PROPOSED');
  assert.equal(store.decideRecalibration(proposal.id, 'APPROVED', { decidedBy: 'reviewer', reason: 'validated' }).status, 'APPROVED');
  assert.throws(() => store.decideRecalibration(proposal.id, 'REJECTED'), /recalibration-already-decided/);
});

test('failure registry is persistent and tamper-evident', () => {
  const filePath = tempFile();
  const store = createOperationalGovernanceStore({ filePath });
  const failure = store.recordFailure({ code: 'SOURCE_STALE', description: 'source freshness exceeded', severity: 'high' });
  store.closeFailure(failure.id, 'source refreshed');
  assert.equal(store.snapshot().failures[0].status, 'CLOSED');
  const state = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  state.failures[0].description = 'tampered';
  fs.writeFileSync(filePath, JSON.stringify(state));
  assert.throws(() => store.verifyIntegrity(), /governance-store-integrity-mismatch/);
});
