'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { append } = require('../js/decision-artifact-store');
const { createOutcomeLearningStore } = require('../scripts/outcome-learning');
const { linkOutcome, verifyLifecycle } = require('../scripts/decision-lifecycle-closure');

function tempFiles() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vidik-lifecycle-'));
  return {
    artifactFile: path.join(dir, 'decisions.json'),
    outcomeFile: path.join(dir, 'outcomes.json'),
    lineageFile: path.join(dir, 'lineage.json')
  };
}

const input = {
  decisionId: 'VIDIK-LIFECYCLE-001',
  decision: { rationale: { recommendation: 'hold-status-quo' } },
  audit: { event: 'DECISION_CREATED' },
  counterfactual: { statusQuo: true, alternatives: [] },
  evidence: { claims: [{ id: 'e1', status: 'verified' }] },
  parameters: { value: 1, unit: 'test-unit' },
  analysis: { uncertainty: 'bounded' },
  governance: { override: null },
  learning: { checkpoints: [6, 12, 24, 60] },
  provenance: { source: 'test' }
};

test('outcome is linked to the exact immutable decision artifact hash', () => {
  const files = tempFiles();
  append(files.artifactFile, input);
  const learning = createOutcomeLearningStore({ filePath: files.outcomeFile });
  const outcome = learning.recordOutcome({ decisionId: input.decisionId, parameterName: 'test', city: 'Ottawa', predicted: 100, observed: 90, checkpoint: '6-month', decisionAt: '2026-01-01T00:00:00.000Z', outcomeAt: '2026-07-01T00:00:00.000Z' });
  linkOutcome({ ...files, outcomeId: outcome.id, decisionId: input.decisionId });
  const result = verifyLifecycle(files);
  assert.equal(result.ok, true);
  assert.equal(result.lineageCount, 1);
});

test('lifecycle verification fails closed when the decision artifact is altered', () => {
  const files = tempFiles();
  append(files.artifactFile, input);
  const learning = createOutcomeLearningStore({ filePath: files.outcomeFile });
  const outcome = learning.recordOutcome({ decisionId: input.decisionId, parameterName: 'test', predicted: 100, observed: 90, checkpoint: '6-month', decisionAt: '2026-01-01T00:00:00.000Z', outcomeAt: '2026-07-01T00:00:00.000Z' });
  linkOutcome({ ...files, outcomeId: outcome.id, decisionId: input.decisionId });
  const records = JSON.parse(fs.readFileSync(files.artifactFile, 'utf8'));
  records[0].artifact.decision.rationale.recommendation = 'tampered';
  fs.writeFileSync(files.artifactFile, JSON.stringify(records));
  assert.equal(verifyLifecycle(files).ok, false);
});

test('linking fails closed when no immutable artifact exists for the decision', () => {
  const files = tempFiles();
  const learning = createOutcomeLearningStore({ filePath: files.outcomeFile });
  const outcome = learning.recordOutcome({ decisionId: input.decisionId, parameterName: 'test', predicted: 10, observed: 9, checkpoint: '6-month', decisionAt: '2026-01-01T00:00:00.000Z', outcomeAt: '2026-07-01T00:00:00.000Z' });
  assert.throws(() => linkOutcome({ ...files, outcomeId: outcome.id, decisionId: input.decisionId }), /decision-artifact-missing/);
});

test('lineage tampering is detected independently of the underlying stores', () => {
  const files = tempFiles();
  append(files.artifactFile, input);
  const learning = createOutcomeLearningStore({ filePath: files.outcomeFile });
  const outcome = learning.recordOutcome({ decisionId: input.decisionId, parameterName: 'test', predicted: 100, observed: 90, checkpoint: '6-month', decisionAt: '2026-01-01T00:00:00.000Z', outcomeAt: '2026-07-01T00:00:00.000Z' });
  linkOutcome({ ...files, outcomeId: outcome.id, decisionId: input.decisionId });
  const lineage = JSON.parse(fs.readFileSync(files.lineageFile, 'utf8'));
  lineage.records[0].decisionArtifactHash = '0'.repeat(64);
  fs.writeFileSync(files.lineageFile, JSON.stringify(lineage));
  assert.equal(verifyLifecycle(files).ok, false);
});
