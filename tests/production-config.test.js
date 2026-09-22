'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { REQUIRED, validateProductionConfig } = require('../scripts/production-config');

function valid() {
  return {
    NODE_ENV: 'production',
    VIDIK_DATABASE_URL: 'postgresql://managed.example/vidik',
    VIDIK_AUTH_ISSUER: 'https://auth.example',
    VIDIK_AUTH_AUDIENCE: 'vidik',
    VIDIK_SECRETS_PROVIDER: 'managed',
    VIDIK_PUBLIC_BASE_URL: 'https://vidik.example',
  };
}

test('production contract requires every managed service setting', () => {
  for (const name of REQUIRED) {
    const env = valid();
    delete env[name];
    assert.throws(() => validateProductionConfig(env), /missing-production-config/);
  }
});

test('production contract rejects local persistence and non-TLS public URLs', () => {
  const local = valid();
  local.VIDIK_DATABASE_URL = 'file:./data/vidik.json';
  assert.throws(() => validateProductionConfig(local), /managed-postgres-required/);
  const http = valid();
  http.VIDIK_PUBLIC_BASE_URL = 'http://vidik.example';
  assert.throws(() => validateProductionConfig(http), /production-tls-required/);
});

test('production contract rejects disabled secret providers', () => {
  for (const provider of ['local', 'none', 'disabled']) {
    const env = valid();
    env.VIDIK_SECRETS_PROVIDER = provider;
    assert.throws(() => validateProductionConfig(env), /managed-secrets-required/);
  }
});

test('valid configuration returns a non-secret deployment contract', () => {
  const config = validateProductionConfig(valid());
  assert.equal(config.database, 'managed-postgresql');
  assert.equal(config.tenantSource, 'authenticated-server-side-identity');
  assert.equal(Object.prototype.hasOwnProperty.call(config, 'databaseUrl'), false);
});
