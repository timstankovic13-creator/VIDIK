'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createPostgresDecisionStore } = require('../js/postgres-decision-store');

const TENANT = '11111111-1111-4111-8111-111111111111';
const DECISION = '22222222-2222-4222-8222-222222222222';

function fakePool() {
  const queries = [];
  const rows = [];
  const client = {
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (sql.startsWith('BEGIN') || sql.startsWith('COMMIT') || sql.startsWith('ROLLBACK')) return { rows: [] };
      if (sql.includes('INSERT INTO vidik_tenants')) return { rows: [] };
      if (sql.includes('SELECT COALESCE(MAX(event_sequence)')) return { rows: [{ sequence: rows.length + 1, previous_hash: rows.at(-1)?.event_hash || null }] };
      if (sql.includes('INSERT INTO vidik_decisions')) return { rows: [{ id: DECISION, decision_key: params[1], created_at: '2026-01-01', updated_at: '2026-01-01' }] };
      if (sql.includes('INSERT INTO vidik_audit_events')) {
        const payload = JSON.parse(params[5]);
        const eventHash = params[7];
        rows.push({ event_sequence: Number(params[1]), event_type: params[2], aggregate_type: params[3], aggregate_id: params[4], payload, previous_hash: params[6], event_hash: eventHash });
        return { rows: [] };
      }
      if (sql.includes('SELECT event_sequence, event_type')) return { rows: [...rows] };
      if (sql.includes('SELECT id, decision_key')) return { rows: [{ id: DECISION, decision_key: params[1], payload: { ok: true } }] };
      throw new Error('unexpected-query:' + sql);
    },
    release() {},
  };
  return { queries, async connect() { return client; } };
}

test('tenant id is required and cannot be supplied as an arbitrary value', async () => {
  const store = createPostgresDecisionStore(fakePool());
  await assert.rejects(() => store.getDecision({ tenantId: 'not-a-uuid', decisionKey: 'x' }), /authenticated-tenant-id-required/);
});

test('decision save is transactionally tenant-scoped and creates an audit event', async () => {
  const pool = fakePool();
  const store = createPostgresDecisionStore(pool);
  const result = await store.saveDecision({
    tenantId: TENANT,
    decisionKey: 'crime-demo',
    artifact: { schema: 'VIDIK.DecisionArtifact.v1', integrity: { contentHash: 'abc' } },
  });
  assert.equal(result.decision.id, DECISION);
  assert.equal(result.audit.sequence, 1);
  const setConfig = pool.queries.find(q => q.sql.includes('set_config'));
  assert.deepEqual(setConfig.params, ['app.tenant_id', TENANT]);
  assert.ok(pool.queries.some(q => q.sql.startsWith('BEGIN')));
  assert.ok(pool.queries.some(q => q.sql.startsWith('COMMIT')));
});

test('audit verification detects a broken chain', async () => {
  const pool = fakePool();
  const store = createPostgresDecisionStore(pool);
  await store.saveDecision({ tenantId: TENANT, decisionKey: 'x', artifact: { integrity: { contentHash: 'a' } } });
  pool.queries.push({ sql: 'noop', params: [] });
  const originalConnect = pool.connect;
  const badClient = await originalConnect();
  const originalQuery = badClient.query;
  badClient.query = async (sql, params) => {
    if (sql.includes('SELECT event_sequence, event_type')) {
      const result = await originalQuery.call(badClient, sql, params);
      result.rows[0].event_hash = 'tampered';
      return result;
    }
    return originalQuery.call(badClient, sql, params);
  };
  pool.connect = async () => badClient;
  const verification = await store.verifyAuditChain({ tenantId: TENANT });
  assert.equal(verification.ok, false);
  assert.equal(verification.reason, 'audit-event-hash-mismatch');
});
