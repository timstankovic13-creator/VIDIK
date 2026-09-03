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
  fields: Object.fromEntries(manifest.requests[0].fields.map(f => [f, { value:'verified', source:'municipal-record-001' }]))
};
assert.equal(validateEvidenceReturn(manifest.requests[0], base).promotable, true);

for (const field of manifest.requests[0].fields) {
  for (const badValue of [null, '', {value:'x'}, {value:'x',source:''}, {value:'',source:'src'}, 'aggregate only']) {
    const returned = { ...base, fields: { ...base.fields, [field]: badValue } };
    const result = validateEvidenceReturn(manifest.requests[0], returned);
    assert.equal(result.promotable, false);
    assert.ok(result.failures.includes(`invalid-material-field:${field}`));
  }
}
for (const gate of ['temporalAdmissible','provenanceComplete','exposureVerified','comparatorDefensible','measurementReady']) {
  const returned = { ...base, [gate]: false };
  assert.equal(validateEvidenceReturn(manifest.requests[0], returned).promotable, false, gate);
}
const aggregateOnly = { ...base, exposureVerified:false, comparatorDefensible:false };
assert.equal(validateEvidenceReturn(manifest.requests[0], aggregateOnly).promotable, false);
assert.equal(validateEvidenceReturn(manifest.requests[0], null).promotable, false);
assert.equal(validateEvidenceReturn({ case:'999' }, base).promotable, false);
console.log('PASS — evidence-return validator requires structured field values with source provenance and all promotion gates');
