'use strict';
const assert = require('node:assert/strict');
const manifest = require('../data/VIDIK_EVIDENCE_REQUEST_MANIFEST.json');
const { REQUIRED_BY_CASE, validateEvidenceReturn } = require('../js/vidik-evidence-request-validator');

assert.deepEqual(Object.keys(REQUIRED_BY_CASE), ['009','010','014','006']);
for (const request of manifest.requests) assert.deepEqual(REQUIRED_BY_CASE[request.case], request.fields);

const base = {
  temporalAdmissible: true,
  provenanceComplete: true,
  exposureVerified: true,
  comparatorDefensible: true,
  measurementReady: true,
  fields: Object.fromEntries(manifest.requests[0].fields.map(f => [f, 'verified']))
};
assert.equal(validateEvidenceReturn(manifest.requests[0], base).promotable, true);

for (const field of manifest.requests[0].fields) {
  const returned = { ...base, fields: { ...base.fields, [field]: null } };
  const result = validateEvidenceReturn(manifest.requests[0], returned);
  assert.equal(result.promotable, false);
  assert.ok(result.failures.includes(`missing-material-field:${field}`));
}
for (const gate of ['temporalAdmissible','provenanceComplete','exposureVerified','comparatorDefensible','measurementReady']) {
  const returned = { ...base, [gate]: false };
  const result = validateEvidenceReturn(manifest.requests[0], returned);
  assert.equal(result.promotable, false, gate);
}

const aggregateOnly = { ...base, exposureVerified: false, comparatorDefensible: false, fields: { ...base.fields, 'approach/intersection traffic volume': 'aggregate only' } };
assert.equal(validateEvidenceReturn(manifest.requests[0], aggregateOnly).promotable, false);
assert.equal(validateEvidenceReturn(manifest.requests[0], null).promotable, false);
assert.equal(validateEvidenceReturn({ case: '999' }, base).promotable, false);
console.log('PASS — evidence-return validator rejects missing material fields and any failed promotion gate');
