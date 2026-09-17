'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { verifyManagedDatabase, verifyProductionIdentity } = require('../scripts/production-deployment-verifier');

function fakePool({ tls = true, superuser = false, forceRls = true, policies = true } = {}) {
  const rows = {
    connection: [{ database_role: 'vidik_app', server_version_num: 150000, tls_active: tls, role_is_superuser: superuser }],
    tables: ['vidik_decisions','vidik_outcomes','vidik_audit_events'].map(relname => ({ relname, relforcerowsecurity: forceRls })),
    policies: policies ? ['vidik_decisions','vidik_outcomes','vidik_audit_events'].map(tablename => ({ tablename, policyname: `${tablename}_tenant_isolation` })) : [],
  };
  return {
    async connect() {
      return {
        async query(sql) {
          if (/current_user/.test(sql)) return { rows: rows.connection };
          if (/relforcerowsecurity/.test(sql)) return { rows: rows.tables };
          if (/FROM pg_policies/.test(sql)) return { rows: rows.policies };
          throw new Error(`unexpected-query:${sql}`);
        },
        release() {},
      };
    },
  };
}

test('managed database verifier requires TLS, non-superuser role, forced RLS and policies', async () => {
  const result = await verifyManagedDatabase(fakePool());
  assert.equal(result.ok, true);
  assert.equal(result.tlsActive, true);
  assert.equal(result.postgresqlMajor, 15);
  await assert.rejects(() => verifyManagedDatabase(fakePool({ tls: false })), /managed-database-tls-required/);
  await assert.rejects(() => verifyManagedDatabase(fakePool({ superuser: true })), /managed-database-superuser-role-forbidden/);
  await assert.rejects(() => verifyManagedDatabase(fakePool({ forceRls: false })), /managed-database-force-rls-required/);
  await assert.rejects(() => verifyManagedDatabase(fakePool({ policies: false })), /managed-database-rls-incomplete/);
});

test('production identity must match configured issuer and audience', () => {
  const env = {
    NODE_ENV: 'production',
    VIDIK_DATABASE_URL: 'postgresql://managed.example/vidik',
    VIDIK_AUTH_ISSUER: 'https://issuer.example',
    VIDIK_AUTH_AUDIENCE: 'vidik',
    VIDIK_SECRETS_PROVIDER: 'managed',
    VIDIK_PUBLIC_BASE_URL: 'https://vidik.example',
  };
  const identity = { verified: true, sub: 'u1', tenant_id: '11111111-1111-4111-8111-111111111111', role: 'operator', iss: env.VIDIK_AUTH_ISSUER, aud: env.VIDIK_AUTH_AUDIENCE };
  assert.equal(verifyProductionIdentity(identity, env).tenantId, identity.tenant_id);
  assert.throws(() => verifyProductionIdentity({ ...identity, aud: 'wrong' }, env), /identity-audience-mismatch/);
  assert.throws(() => verifyProductionIdentity({ ...identity, verified: false }, env), /unverified-identity/);
});
