'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { repositoryReadiness, environmentReadiness, evaluateProductionReadiness } = require('../scripts/production-readiness');

const root = path.resolve(__dirname, '..');

function productionEnv() {
  return {
    NODE_ENV: 'production',
    VIDIK_DATABASE_URL: 'postgresql://managed.example/vidik',
    VIDIK_AUTH_ISSUER: 'https://auth.example',
    VIDIK_AUTH_AUDIENCE: 'vidik',
    VIDIK_SECRETS_PROVIDER: 'managed',
    VIDIK_PUBLIC_BASE_URL: 'https://vidik.example',
  };
}

test('repository production controls are present', () => {
  const result = repositoryReadiness(root);
  assert.equal(result.ok, true);
  assert.deepEqual(result.missing, []);
});

test('production environment requires managed persistence, identity, secrets and TLS', () => {
  assert.equal(environmentReadiness(productionEnv()).ok, true);
  assert.equal(environmentReadiness({ NODE_ENV: 'production' }).ok, false);
  assert.equal(environmentReadiness({ ...productionEnv(), VIDIK_DATABASE_URL: 'file:./data.db' }).code, 'managed-postgres-required');
  assert.equal(environmentReadiness({ ...productionEnv(), VIDIK_PUBLIC_BASE_URL: 'http://vidik.example' }).code, 'production-tls-required');
  assert.equal(environmentReadiness({ ...productionEnv(), VIDIK_SECRETS_PROVIDER: 'local' }).code, 'managed-secrets-required');
});

test('combined readiness is fail-closed when environment is not provisioned', () => {
  const result = evaluateProductionReadiness({ root, env: { NODE_ENV: 'test' } });
  assert.equal(result.repository.ok, true);
  assert.equal(result.environment.ok, false);
  assert.equal(result.ok, false);
});
