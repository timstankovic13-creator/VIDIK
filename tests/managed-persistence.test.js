'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createManagedPersistence, withTenantTransaction, sha256 } = require('../scripts/managed-persistence');

const TENANT = '11111111-1111-4111-8111-111111111111';
const DECISION = '22222222-2222-4222-8222-222222222222';
const AGGREGATE = DECISION;

function makeClient(responses = []) {
  const queries = [];
  let index = 0;
  return {
    queries,
    async query(text, params) {
      queries.push({ text, params });
      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rows: [] };
      if (text.includes("set_config('app.tenant_id'")) return { rows: [] };
      return responses[index++] || { rows: [] };
    },
    release() { this.released = true; },
  };
}

function makePool(client) {
  return { async connect() { return client; } };
}

function identity(role = 'operator', tenantId = TENANT) {
  return { verified: true, sub: 'user-1', tenant_id: tenantId, role, iss: 'https://issuer.example', aud: 'vidik' };
}

test('tenant transaction binds app.tenant_id from verified identity and commits atomically', async () => {
  const client = makeClient();
  const result = await withTenantTransaction(makePool(client), identity(), async (_db, verified) => verified.tenantId);
  assert.equal(result, TENANT);
  assert.deepEqual(client.queries.slice(0, 2).map(q => q.text), ['BEGIN', "SELECT set_config('app.tenant_id', $1, true)"]);
  assert.deepEqual(client.queries[1].params, [TENANT]);
  assert.equal(client.queries.at(-1).text, 'COMMIT');
  assert.equal(client.released, true);
});

test('decision persistence never accepts tenant_id from the write payload', async () => {
  const client = makeClient([{ rows: [{ id: DECISION, tenant_id: TENANT, decision_key: 'd-1', payload: { problem: 'test' } }] }]);
  const store = createManagedPersistence({ pool: makePool(client), identity: identity() });
  const row = await store.createDecision({ decisionKey: 'd-1', payload: { problem: 'test', tenant_id: 'attacker-controlled' } });
  assert.equal(row.tenant_id, TENANT);
  const insert = client.queries.find(q => q.text.includes('INSERT INTO vidik_decisions'));
  assert.ok(insert);
  assert.match(insert.text, /current_setting\('app\.tenant_id', true\)::uuid/);
  assert.ok(!insert.text.includes('$3'));
});

test('cross-tenant identity cannot be replaced by caller-supplied tenant input', async () => {
  const client = makeClient([{ rows: [{ id: DECISION, tenant_id: TENANT }] }]);
  const store = createManagedPersistence({ pool: makePool(client), identity: identity('operator') });
  await store.createDecision({ decisionKey: 'd-2', tenantId: '33333333-3333-4333-8333-333333333333', payload: {} });
  const config = client.queries.find(q => q.text.includes("set_config('app.tenant_id'"));
  assert.deepEqual(config.params, [TENANT]);
});

test('outcome and audit writes require a permitted role and remain tenant-bound', async () => {
  const outcomeClient = makeClient([{ rows: [{ id: 'o-1', tenant_id: TENANT, decision_id: DECISION }] }]);
  const store = createManagedPersistence({ pool: makePool(outcomeClient), identity: identity('reviewer') });
  await store.recordOutcome({ decisionId: DECISION, parameterName: 'effect', checkpoint: '6-month', predicted: 10, observed: 9, decisionAt: '2026-01-01T00:00:00Z', outcomeAt: '2026-07-01T00:00:00Z' });
  const outcomeInsert = outcomeClient.queries.find(q => q.text.includes('INSERT INTO vidik_outcomes'));
  assert.ok(outcomeInsert);
  assert.match(outcomeInsert.text, /current_setting\('app\.tenant_id', true\)::uuid/);

  const auditClient = makeClient([{ rows: [] }, { rows: [{ id: 'a-1', tenant_id: TENANT, event_sequence: 1, event_hash: sha256({ tenantId: TENANT, eventSequence: 1, eventType: 'decision', aggregateType: 'decision', aggregateId: AGGREGATE, payload: null, previousHash: '' }) }] }]);
  const auditStore = createManagedPersistence({ pool: makePool(auditClient), identity: identity('operator') });
  const event = await auditStore.appendAudit({ eventType: 'decision', aggregateType: 'decision', aggregateId: AGGREGATE });
  assert.equal(event.tenant_id, TENANT);
  const auditInsert = auditClient.queries.find(q => q.text.includes('INSERT INTO vidik_audit_events'));
  assert.ok(auditInsert);
  assert.match(auditInsert.text, /current_setting\('app\.tenant_id', true\)::uuid/);
});

test('viewer cannot write outcomes or audit events', async () => {
  const store = createManagedPersistence({ pool: makePool(makeClient()), identity: identity('viewer') });
  await assert.rejects(() => store.recordOutcome({ decisionId: DECISION, parameterName: 'effect', checkpoint: '6-month', predicted: 1, observed: 1, decisionAt: '2026-01-01T00:00:00Z', outcomeAt: '2026-07-01T00:00:00Z' }), { code: 'insufficient-role' });
  await assert.rejects(() => store.appendAudit({ eventType: 'decision', aggregateType: 'decision', aggregateId: AGGREGATE }), { code: 'insufficient-role' });
});

test('transaction rolls back on persistence failure and always releases the client', async () => {
  const client = makeClient();
  const originalQuery = client.query;
  client.query = async function(text, params) {
    if (typeof text === 'string' && text.includes('set_config')) throw Object.assign(new Error('db-failure'), { code: 'db-failure' });
    return originalQuery.call(this, text, params);
  };
  await assert.rejects(() => withTenantTransaction(makePool(client), identity(), async () => 'unreachable'), { code: 'db-failure' });
  assert.equal(client.queries.at(-1).text, 'ROLLBACK');
  assert.equal(client.released, true);
});
