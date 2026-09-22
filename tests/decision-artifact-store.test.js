'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { artifact, verifyArtifact, append, readStore, verifyChain, replay } = require('../js/decision-artifact-store');

const input = {
  decisionId: 'VIDIK-TEST-001',
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

function tempStore() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vidik-artifacts-'));
  return path.join(dir, 'decisions.json');
}

test('artifact envelope is deterministic and tamper-evident', () => {
  const a = artifact(input);
  assert.equal(a.schema, 'VIDIK.DecisionArtifact.v1');
  assert.equal(a.integrity.algorithm, 'SHA-256');
  assert.equal(verifyArtifact(a).ok, true);
  const tampered = JSON.parse(JSON.stringify(a));
  tampered.decision.rationale.recommendation = 'different-decision';
  assert.equal(verifyArtifact(tampered).ok, false);
});

test('append creates an immutable hash chain and survives a new reader', () => {
  const file = tempStore();
  const first = append(file, input);
  const second = append(file, { ...input, decisionId: 'VIDIK-TEST-002' });
  const records = readStore(file);
  const chain = verifyChain(records);
  assert.equal(records.length, 2);
  assert.equal(first.sequence, 0);
  assert.equal(second.sequence, 1);
  assert.equal(second.previousHash, first.chainHash);
  assert.equal(chain.ok, true);
  assert.equal(chain.length, 2);
});

test('chain fails closed when a persisted record is altered', () => {
  const file = tempStore();
  append(file, input);
  const records = readStore(file);
  records[0].artifact.audit.event = 'ALTERED';
  assert.equal(verifyChain(records).ok, false);
});

test('replay verifies the chain before executing a decision function', () => {
  const file = tempStore();
  append(file, input);
  append(file, { ...input, decisionId: 'VIDIK-TEST-002' });
  const result = replay(file, a => a.decision.rationale.recommendation);
  assert.equal(result.ok, true);
  assert.deepEqual(result.results.map(r => r.result), ['hold-status-quo', 'hold-status-quo']);
});
