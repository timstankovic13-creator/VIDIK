'use strict';

const { validateProductionConfig } = require('./production-config');
const { normalizeVerifiedIdentity } = require('./authenticated-identity');

function fail(code, detail) {
  const error = new Error(detail ? `${code}: ${detail}` : code);
  error.code = code;
  throw error;
}

async function verifyManagedDatabase(pool) {
  if (!pool || typeof pool.connect !== 'function') fail('managed-pool-required');
  const client = await pool.connect();
  try {
    const connection = await client.query(`
      SELECT
        current_user AS database_role,
        current_setting('server_version_num')::int AS server_version_num,
        COALESCE((SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()), false) AS tls_active,
        EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND rolsuper) AS role_is_superuser
    `);
    const tables = await client.query(`
      SELECT c.relname, c.relforcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname IN ('vidik_decisions','vidik_outcomes','vidik_audit_events')
      ORDER BY c.relname
    `);
    const policies = await client.query(`
      SELECT tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename IN ('vidik_decisions','vidik_outcomes','vidik_audit_events')
      ORDER BY tablename, policyname
    `);
    const row = connection.rows[0];
    const requiredTables = new Set(tables.rows.map(r => r.relname));
    const forcedTables = tables.rows.filter(r => r.relforcerowsecurity).map(r => r.relname);
    const requiredPolicies = new Set(policies.rows.map(r => r.tablename));
    const missingTables = ['vidik_decisions','vidik_outcomes','vidik_audit_events'].filter(name => !requiredTables.has(name));
    const missingPolicies = ['vidik_decisions','vidik_outcomes','vidik_audit_events'].filter(name => !requiredPolicies.has(name));
    if (missingTables.length) fail('managed-database-schema-incomplete', missingTables.join(','));
    if (missingPolicies.length) fail('managed-database-rls-incomplete', missingPolicies.join(','));
    if (forcedTables.length !== 3) fail('managed-database-force-rls-required');
    if (row.role_is_superuser) fail('managed-database-superuser-role-forbidden');
    if (!row.tls_active) fail('managed-database-tls-required');
    if (row.server_version_num < 150000) fail('managed-database-postgresql-version-required');
    return Object.freeze({
      ok: true,
      databaseRole: row.database_role,
      postgresqlMajor: Math.floor(row.server_version_num / 10000),
      tlsActive: row.tls_active,
      forceRlsTables: forcedTables,
    });
  } finally {
    client.release();
  }
}

function verifyProductionIdentity(identity, env = process.env) {
  const config = validateProductionConfig(env);
  const normalized = normalizeVerifiedIdentity(identity);
  if (normalized.issuer !== config.auth.issuer) fail('identity-issuer-mismatch');
  if (normalized.audience !== config.auth.audience) fail('identity-audience-mismatch');
  return Object.freeze({ ok: true, tenantId: normalized.tenantId, role: normalized.role, issuer: normalized.issuer, audience: normalized.audience });
}

module.exports = { verifyManagedDatabase, verifyProductionIdentity };
