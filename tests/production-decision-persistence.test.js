'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { persistProductionDecision, persistOutcome } = require('../js/production-decision-persistence');

test('production decision persistence refuses blocked results', async () => {
  await assert.rejects(
    () => persistProductionDecision({ store: {}, tenantId: 'x', decisionKey: 'x', result: { status: 'BLOCKED' } }),
    /decision-store-required/,
  );
});

test('production decision persistence requires the complete immutable artifact', async () => {
  const store = { saveDecision: async () => ({ decision: { id: 'd', decision_key: 'x' }, audit: { sequence: 1 } }) };
  await assert.rejects(
    () => persistProductionDecision({ store, tenantId: 'x', decisionKey: 'x', result: { status: 'RECOMMENDATION_ELIGIBLE' } }),
    /complete-decision-artifact-required/,
  );
});

test('eligible decision is persisted with artifact lineage and audit result', async () => {
  const calls = [];
  const store = { saveDecision: async args => {
    calls.push(args);
    return { decision: { id: 'decision-1', decision_key: args.decisionKey }, audit: { sequence: 1, eventHash: 'hash-1' } };
  }};
  const result = {
    status: 'RECOMMENDATION_ELIGIBLE',
    artifact: { artifact: { integrity: { contentHash: 'artifact-hash' } } },
    lineage: { artifactHash: 'artifact-hash' },
  };
  const persisted = await persistProductionDecision({ store, tenantId: 'tenant-1', decisionKey: 'housing-1', result });
  assert.equal(persisted.status, 'PERSISTED');
  assert.equal(persisted.decisionId, 'decision-1');
  assert.equal(calls[0].tenantId, 'tenant-1');
  assert.equal(calls[0].artifact.integrity.contentHash, 'artifact-hash');
});

test('outcome persistence preserves the governed checkpoint contract', async () => {
  const calls = [];
  const store = { recordOutcome: async args => { calls.push(args); return { outcome: { id: 'o1' } }; } };
  const result = await persistOutcome({
    store,
    tenantId: 'tenant-1',
    decisionId: 'decision-1',
    observation: {
      parameterName: 'housing.effect',
      checkpoint: '1-year',
      predicted: 10,
      observed: 8,
      decisionAt: '2026-01-01T00:00:00Z',
      outcomeAt: '2027-01-01T00:00:00Z',
    },
  });
  assert.equal(result.outcome.id, 'o1');
  assert.deepEqual(calls[0], {
    tenantId: 'tenant-1',
    decisionId: 'decision-1',
    parameterName: 'housing.effect',
    checkpoint: '1-year',
    predicted: 10,
    observed: 8,
    decisionAt: '2026-01-01T00:00:00Z',
    outcomeAt: '2027-01-01T00:00:00Z',
  });
});
