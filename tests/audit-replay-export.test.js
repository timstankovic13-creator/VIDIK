'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { artifact, append } = require('../js/decision-artifact-store');
const { exportAuditBundle, replayAuditBundle } = require('../scripts/audit-replay-export');

test('audit export preserves exact artifact lineage and operational state', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vidik-audit-'));
  const store = path.join(dir, 'artifacts.json');
  const output = path.join(dir, 'audit-bundle.json');
  const a = artifact({
    decisionId: 'decision-audit-1',
    decision: { identityBrief: { decisionId: 'decision-audit-1' }, rationale: { recommendation: 'option-a' } },
    audit: { override: null, reason: 'evidence-backed' },
    counterfactual: { statusQuo: true },
    evidence: { claims: ['claim-1'] },
    parameters: { effect: 0.2 },
    analysis: { uncertainty: 0.1 },
    governance: { review: { status: 'SCHEDULED' } },
    learning: { checkpoints: ['6-month'] },
    provenance: { source: 'test-source' }
  });
  append(store, a);

  const bundle = exportAuditBundle(store, output);
  assert.equal(bundle.schema, 'VIDIK.AuditReplayBundle.v1');
  assert.equal(bundle.decisions.length, 1);
  assert.equal(bundle.decisions[0].decisionId, 'decision-audit-1');
  assert.equal(bundle.decisions[0].artifactContentHash, a.integrity.contentHash);
  assert.deepEqual(bundle.decisions[0].operational.governance, a.governance);
  assert.deepEqual(bundle.decisions[0].operational.learning, a.learning);
  assert.ok(fs.existsSync(output));

  const replay = replayAuditBundle(store);
  assert.equal(replay.ok, true);
  assert.equal(replay.decisions[0].recommendation, 'option-a');
  assert.equal(replay.decisions[0].contentHash, a.integrity.contentHash);
});

test('audit replay and export fail closed on tampered lineage', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vidik-audit-tamper-'));
  const store = path.join(dir, 'artifacts.json');
  const output = path.join(dir, 'audit-bundle.json');
  append(store, artifact({
    decisionId: 'decision-audit-2', decision: { rationale: { recommendation: 'option-b' } },
    audit: {}, counterfactual: {}, evidence: {}, parameters: {}, analysis: {}, governance: {}, learning: {}
  }));
  const parsed = JSON.parse(fs.readFileSync(store, 'utf8'));
  parsed[0].artifact.decision.rationale.recommendation = 'tampered';
  fs.writeFileSync(store, JSON.stringify(parsed));

  assert.equal(replayAuditBundle(store).ok, false);
  assert.throws(() => exportAuditBundle(store, output), /audit-export-blocked/);
});
