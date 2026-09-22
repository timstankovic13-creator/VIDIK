'use strict';

const crypto = require('node:crypto');

const REQUIRED_CLAIMS = Object.freeze(['sub', 'tenant_id', 'role']);
const ALLOWED_ROLES = Object.freeze(['admin', 'operator', 'reviewer', 'analyst', 'viewer']);

function fail(code, detail) {
  const error = new Error(detail ? `${code}: ${detail}` : code);
  error.code = code;
  throw error;
}

function normalizeVerifiedIdentity(identity = {}) {
  if (!identity || identity.verified !== true) fail('unverified-identity');
  for (const claim of REQUIRED_CLAIMS) {
    if (typeof identity[claim] !== 'string' || identity[claim].trim() === '') fail(`missing-identity-claim:${claim}`);
  }
  if (!crypto.randomUUID || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identity.tenant_id)) fail('invalid-tenant-id');
  if (!ALLOWED_ROLES.includes(identity.role)) fail('invalid-identity-role');
  return Object.freeze({
    subject: identity.sub,
    tenantId: identity.tenant_id,
    role: identity.role,
    issuer: typeof identity.iss === 'string' ? identity.iss : null,
    audience: typeof identity.aud === 'string' ? identity.aud : null,
  });
}

function assertRole(identity, roles) {
  const normalized = normalizeVerifiedIdentity(identity);
  if (!roles.includes(normalized.role)) fail('insufficient-role');
  return normalized;
}

module.exports = { ALLOWED_ROLES, REQUIRED_CLAIMS, normalizeVerifiedIdentity, assertRole };
