'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createOperationalLearningLoop } = require('../scripts/operational-learning-loop');

function tempPaths() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vidik-learning-loop-'));
  return { dir, learningFilePath: path.join(dir, 'learning.json'), governanceFilePath: path.join(dir, 'governance.json') };
}

test('operational loop closes decision to review, outcome, drift and human recalibration', () => {
  const paths = tempPaths();
  const loop = createOperationalLearningLoop({ decisionId: 'decision-1', ...paths });
  const decisionAt = '2026-01-01T00:00:00.000Z';
  const reviews = loop.scheduleAllReviews(decisionAt);
  assert.equal(reviews.length, 4);

  loop.recordOutcome({ decisionId: 'decision-1', parameterName: 'effect', predicted: 10, observed: 12, checkpoint: '6-month', decisionAt, outcomeAt: '2026-07-01T00:00:00.000Z' });
  loop.recordOutcome({ decisionId: 'decision-1', parameterName: 'effect', predicted: 10, observed: 14, checkpoint: '1-year', decisionAt, outcomeAt: '2027-01-01T00:00:00.000Z' });

  const result = loop.proposeRecalibration({ decisionId: 'decision-1', parameterName: 'effect', currentValue: 10 });
  assert.equal(result.proposal.status, 'PROPOSED');
  assert.equal(result.signal.automaticApply, false);
  assert.equal(result.signal.observations, 2);

  const approved = loop.decideRecalibration(result.proposal.id, 'APPROVED', { decidedBy: 'human-reviewer', reason: 'reviewed evidence' });
  assert.equal(approved.status, 'APPROVED');
  assert.equal(loop.integrity().learning.ok, true);
  assert.equal(loop.integrity().governance.ok, true);

  fs.rmSync(paths.dir, { recursive: true, force: true });
});

test('operational loop fails closed on cross-decision writes and premature recalibration', () => {
  const paths = tempPaths();
  const loop = createOperationalLearningLoop({ decisionId: 'decision-1', ...paths });
  assert.throws(() => loop.recordOutcome({ decisionId: 'decision-2', parameterName: 'x', predicted: 1, observed: 1, checkpoint: '6-month', decisionAt: '2026-01-01', outcomeAt: '2026-07-01' }), /decision-id-mismatch/);
  assert.throws(() => loop.proposeRecalibration({ decisionId: 'decision-1', parameterName: 'x', currentValue: 1 }), /insufficient-observations/);
  fs.rmSync(paths.dir, { recursive: true, force: true });
});
