'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { SCHEMA, REQUIRED_CONTROLS, validateEvidence, evaluateDeploymentAcceptance } = require('../scripts/production-deployment-evidence');

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
function seal(value) {
  const copy = JSON.parse(JSON.stringify(value));
  delete copy.integrity;
  return { ...copy, integrity: { algorithm: 'SHA-256', contentHash: crypto.createHash('sha256').update(stable(copy)).digest('hex') } };
}
function evidence() {
  return seal({
    schema: SCHEMA,
    version: 1,
    environment: 'pilot-prod',
    controls: REQUIRED_CONTROLS.map(name => ({ name, status: 'verified', evidence: `attestation:${name}`, verifiedAt: '2026-09-16T00:00:00.000Z', verifiedBy: 'release-engineering' })),
  });
}

test('deployment acceptance requires every environment-level control and integrity seal', () => {
  const valid = evidence();
  assert.equal(validateEvidence(valid).ok, true);
  const missing = { ...valid, controls: valid.controls.slice(1) };
  assert.equal(validateEvidence(missing).code, 'missing-deployment-controls');
  const unverified = JSON.parse(JSON.stringify(valid));
  unverified.controls[0].status = 'pending';
  assert.equal(validateEvidence(unverified).code, 'deployment-evidence-integrity-mismatch');
});

test('deployment acceptance reads a real evidence file and fails closed on tampering', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vidik-deployment-evidence-'));
  const file = path.join(dir, 'evidence.json');
  fs.writeFileSync(file, JSON.stringify(evidence(), null, 2));
  assert.equal(evaluateDeploymentAcceptance(file).ok, true);
  const tampered = JSON.parse(fs.readFileSync(file, 'utf8'));
  tampered.controls[0].evidence = 'changed';
  fs.writeFileSync(file, JSON.stringify(tampered, null, 2));
  assert.equal(evaluateDeploymentAcceptance(file).code, 'deployment-evidence-integrity-mismatch');
  fs.rmSync(dir, { recursive: true, force: true });
});
