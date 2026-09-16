'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');

const SCHEMA = 'VIDIK.ProductionDeploymentEvidence.v1';
const REQUIRED_CONTROLS = Object.freeze([
  'managed-postgresql',
  'authenticated-identity',
  'server-side-tenant-binding',
  'managed-secrets',
  'encrypted-backups-restore-tested',
  'audit-integrity-monitoring',
  'operational-alerting',
  'tls-only-endpoints',
]);

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}

function hash(value) {
  return crypto.createHash('sha256').update(stable(value)).digest('hex');
}

function validateEvidence(input) {
  if (!input || input.schema !== SCHEMA || input.version !== 1) return { ok: false, code: 'invalid-evidence-envelope' };
  if (!input.environment || typeof input.environment !== 'string') return { ok: false, code: 'missing-environment' };
  if (!Array.isArray(input.controls)) return { ok: false, code: 'missing-controls' };
  const controls = new Map(input.controls.map(control => [control.name, control]));
  const missing = REQUIRED_CONTROLS.filter(name => !controls.has(name));
  if (missing.length) return { ok: false, code: 'missing-deployment-controls', missing };
  const incomplete = REQUIRED_CONTROLS.filter(name => {
    const control = controls.get(name);
    return control.status !== 'verified' || typeof control.evidence !== 'string' || control.evidence.trim() === '' || typeof control.verifiedAt !== 'string' || typeof control.verifiedBy !== 'string';
  });
  if (incomplete.length) return { ok: false, code: 'unverified-deployment-controls', incomplete };
  if (!input.integrity?.contentHash) return { ok: false, code: 'missing-evidence-integrity' };
  const copy = JSON.parse(JSON.stringify(input));
  delete copy.integrity;
  const actual = hash(copy);
  if (actual !== input.integrity.contentHash) return { ok: false, code: 'deployment-evidence-integrity-mismatch', expected: input.integrity.contentHash, actual };
  return { ok: true, environment: input.environment, controls: REQUIRED_CONTROLS };
}

function readEvidence(file) {
  const evidence = JSON.parse(fs.readFileSync(file, 'utf8'));
  const result = validateEvidence(evidence);
  if (!result.ok) throw Object.assign(new Error(result.code), { code: result.code, detail: result });
  return evidence;
}

function evaluateDeploymentAcceptance(file) {
  try {
    const evidence = readEvidence(file);
    return Object.freeze({ ok: true, schema: SCHEMA, environment: evidence.environment, controls: REQUIRED_CONTROLS });
  } catch (error) {
    return Object.freeze({ ok: false, code: error.code || 'deployment-evidence-invalid', detail: error.detail || error.message });
  }
}

module.exports = { SCHEMA, REQUIRED_CONTROLS, validateEvidence, readEvidence, evaluateDeploymentAcceptance };
