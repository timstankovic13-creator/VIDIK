'use strict';

const REQUIRED = Object.freeze([
  'VIDIK_DATABASE_URL',
  'VIDIK_AUTH_ISSUER',
  'VIDIK_AUTH_AUDIENCE',
  'VIDIK_SECRETS_PROVIDER',
  'VIDIK_PUBLIC_BASE_URL',
]);

function fail(code, detail) {
  const error = new Error(detail ? `${code}: ${detail}` : code);
  error.code = code;
  throw error;
}

function validateProductionConfig(env = process.env) {
  if (env.NODE_ENV !== 'production') fail('invalid-node-environment');
  const missing = REQUIRED.filter(name => typeof env[name] !== 'string' || env[name].trim() === '');
  if (missing.length) fail('missing-production-config', missing.join(','));
  if (!/^https:\/\//i.test(env.VIDIK_PUBLIC_BASE_URL)) fail('production-tls-required');
  if (!/^postgres(?:ql)?:\/\//i.test(env.VIDIK_DATABASE_URL)) fail('managed-postgres-required');
  if (/^(local|none|disabled)$/i.test(env.VIDIK_SECRETS_PROVIDER.trim())) fail('managed-secrets-required');
  return Object.freeze({
    database: 'managed-postgresql',
    auth: { issuer: env.VIDIK_AUTH_ISSUER, audience: env.VIDIK_AUTH_AUDIENCE },
    secretsProvider: env.VIDIK_SECRETS_PROVIDER,
    publicBaseUrl: env.VIDIK_PUBLIC_BASE_URL,
    tenantSource: 'authenticated-server-side-identity',
  });
}

module.exports = { REQUIRED, validateProductionConfig };
