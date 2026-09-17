'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { Client, Pool } = require('pg');
const { createManagedPersistence, sha256 } = require('../scripts/managed-persistence');

const DATABASE_URL = process.env.VIDIK_TEST_DATABASE_URL;
const TENANT_A = '11111111-1111-4111-8111-111111111111';
const TENANT_B = '22222222-2222-4222-8222-222222222222';
const APP_ROLE = 'vidik_app_acceptance';
const APP_PASSWORD = 'vidik_acceptance_password';
const IDENTITY_A = Object.freeze({ verified: true, sub: 'acceptance-user-a', tenant_id: TENANT_A, role: 'operator', iss: 'https://issuer.example.test', aud: 'vidik' });
const IDENTITY_B = Object.freeze({ verified: true, sub: 'acceptance-user-b', tenant_id: TENANT_B, role: 'operator', iss: 'https://issuer.example.test', aud: 'vidik' });

const PG_QUERY_TIMEOUT_MS = 5000;
const PG_CONNECTION_TIMEOUT_MS = 5000;

function requireDatabase() {
  if (!DATABASE_URL) throw new Error('VIDIK_TEST_DATABASE_URL is required for real PostgreSQL acceptance');
}

function pgOptions(connectionString) {
  return {
    connectionString,
    connectionTimeoutMillis: PG_CONNECTION_TIMEOUT_MS,
    statement_timeout: PG_QUERY_TIMEOUT_MS,
  };
}

async function adminClient() {
  const client = new Client(pgOptions(DATABASE_URL));
  await client.connect();
  return client;
}

async function setupDatabase(admin) {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'infra', 'postgres', '001_vidik_core.sql'), 'utf8');
  await admin.query(schema);
  await admin.query(`DROP ROLE IF EXISTS ${APP_ROLE}`);
  await admin.query(`CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`);
  await admin.query(`GRANT USAGE ON SCHEMA public TO ${APP_ROLE}`);
  await admin.query(`GRANT SELECT, INSERT ON vidik_tenants TO ${APP_ROLE}`);
  await admin.query(`GRANT SELECT, INSERT ON vidik_decisions, vidik_outcomes, vidik_audit_events TO ${APP_ROLE}`);
  await admin.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${APP_ROLE}`);
  await admin.query('INSERT INTO vidik_tenants (id, name) VALUES ($1, $2), ($3, $4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name', [TENANT_A, 'Acceptance Tenant A', TENANT_B, 'Acceptance Tenant B']);
}

async function cleanupDatabase(admin) {
  await admin.query('DELETE FROM vidik_audit_events WHERE tenant_id IN ($1, $2)', [TENANT_A, TENANT_B]);
  await admin.query('DELETE FROM vidik_outcomes WHERE tenant_id IN ($1, $2)', [TENANT_A, TENANT_B]);
  await admin.query('DELETE FROM vidik_decisions WHERE tenant_id IN ($1, $2)', [TENANT_A, TENANT_B]);
  await admin.query('DELETE FROM vidik_tenants WHERE id IN ($1, $2)', [TENANT_A, TENANT_B]);
  await admin.query(`DROP ROLE IF EXISTS ${APP_ROLE}`);
}

test('real PostgreSQL acceptance proves tenant binding, RLS, lifecycle persistence, and audit integrity', { timeout: 30000 }, async t => {
  requireDatabase();
  const admin = await adminClient();
  let pool;
  try {
    await setupDatabase(admin);
    const parsed = new URL(DATABASE_URL);
    const appDatabaseUrl = `postgresql://${APP_ROLE}:${APP_PASSWORD}@${parsed.hostname}:${parsed.port || 5432}${parsed.pathname}`;
    pool = new Pool(pgOptions(appDatabaseUrl));

    const a = createManagedPersistence({ pool, identity: IDENTITY_A });
    const b = createManagedPersistence({ pool, identity: IDENTITY_B });

    const decisionA = await a.createDecision({ decisionKey: 'acceptance-lifecycle-a', payload: { recommendation: 'option-a', tenant_id: TENANT_B } });
    assert.equal(decisionA.tenant_id, TENANT_A, 'tenant must come from verified identity, never the payload');
    assert.equal((await a.getDecision('acceptance-lifecycle-a')).tenant_id, TENANT_A);
    assert.equal(await b.getDecision('acceptance-lifecycle-a'), null, 'tenant B must not read tenant A decisions');

    const decisionB = await b.createDecision({ decisionKey: 'acceptance-lifecycle-b', payload: { recommendation: 'option-b' } });
    assert.equal(decisionB.tenant_id, TENANT_B);

    const outcomeA = await a.recordOutcome({ decisionId: decisionA.id, parameterName: 'expected-effect', checkpoint: '6-month', predicted: 10, observed: 8, decisionAt: '2026-01-01T00:00:00Z', outcomeAt: '2026-07-01T00:00:00Z' });
    assert.equal(outcomeA.tenant_id, TENANT_A);
    assert.equal(outcomeA.error, -2);

    await assert.rejects(
      () => b.recordOutcome({ decisionId: decisionA.id, parameterName: 'cross-tenant-attempt', checkpoint: '6-month', predicted: 1, observed: 1, decisionAt: '2026-01-01T00:00:00Z', outcomeAt: '2026-07-01T00:00:00Z' }),
      error => error && error.code === '23503',
      'cross-tenant outcome reference must be rejected by the composite tenant FK'
    );

    const audit1 = await a.appendAudit({ eventType: 'decision-created', aggregateType: 'decision', aggregateId: decisionA.id, payload: { checkpoint: 'acceptance-1' } });
    const audit2 = await a.appendAudit({ eventType: 'outcome-recorded', aggregateType: 'decision', aggregateId: decisionA.id, payload: { checkpoint: '6-month', observed: 8 } });
    assert.equal(audit1.event_sequence, 1);
    assert.equal(audit1.previous_hash, null);
    assert.equal(audit2.event_sequence, 2);
    assert.equal(audit2.previous_hash, audit1.event_hash);
    assert.equal((await b.getDecision('acceptance-lifecycle-b')).tenant_id, TENANT_B);

    await assert.rejects(() => admin.query('UPDATE vidik_audit_events SET payload = $1 WHERE id = $2', ['{}', audit1.id]), /append-only/);
    await assert.rejects(() => admin.query('DELETE FROM vidik_audit_events WHERE id = $1', [audit1.id]), /append-only/);

    const chain = await admin.query('SELECT tenant_id, event_sequence, event_type, aggregate_type, aggregate_id, payload, previous_hash, event_hash FROM vidik_audit_events WHERE tenant_id = $1 ORDER BY event_sequence', [TENANT_A]);
    assert.equal(chain.rows.length, 2);
    let previousHash = '';
    for (const row of chain.rows) {
      const expectedHash = sha256({ tenantId: row.tenant_id, eventSequence: Number(row.event_sequence), eventType: row.event_type, aggregateType: row.aggregate_type, aggregateId: row.aggregate_id, payload: row.payload, previousHash });
      assert.equal(row.event_hash, expectedHash);
      assert.equal(row.previous_hash, previousHash || null);
      previousHash = row.event_hash;
    }

    const isolation = await admin.query(`
      SELECT
        (SELECT count(*) FROM vidik_decisions WHERE tenant_id = $1) AS decisions_a,
        (SELECT count(*) FROM vidik_decisions WHERE tenant_id = $2) AS decisions_b,
        (SELECT count(*) FROM vidik_outcomes WHERE tenant_id = $1) AS outcomes_a,
        (SELECT count(*) FROM vidik_outcomes WHERE tenant_id = $2) AS outcomes_b,
        (SELECT count(*) FROM vidik_audit_events WHERE tenant_id = $1) AS audit_a,
        (SELECT count(*) FROM vidik_audit_events WHERE tenant_id = $2) AS audit_b
    `, [TENANT_A, TENANT_B]);
    assert.equal(Number(isolation.rows[0].decisions_a), 1);
    assert.equal(Number(isolation.rows[0].decisions_b), 1);
    assert.equal(Number(isolation.rows[0].outcomes_a), 1);
    assert.equal(Number(isolation.rows[0].outcomes_b), 0);
    assert.equal(Number(isolation.rows[0].audit_a), 2);
    assert.equal(Number(isolation.rows[0].audit_b), 0);

    const role = await admin.query('SELECT rolsuper FROM pg_roles WHERE rolname = $1', [APP_ROLE]);
    assert.equal(role.rows[0].rolsuper, false);
    const rls = await admin.query(`
      SELECT c.relname, c.relforcerowsecurity
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname IN ('vidik_decisions','vidik_outcomes','vidik_audit_events')
      ORDER BY c.relname
    `);
    assert.equal(rls.rows.length, 3);
    assert.ok(rls.rows.every(row => row.relforcerowsecurity === true));
  } finally {
    if (pool) await pool.end();
    await cleanupDatabase(admin);
    await admin.end();
  }
});
