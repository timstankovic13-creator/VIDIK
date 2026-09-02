'use strict';

const assert = require('assert');
const { buildAcquisitionSpec, validateRequest } = require('../js/rc4-evidence-acquisition-spec');

const specs = buildAcquisitionSpec();
assert.deepStrictEqual(specs.map(x => x.caseId), ['006', '009', '010', '014']);
assert.strictEqual(specs.length, 4);

for (const spec of specs) {
  assert.ok(spec.unit);
  assert.ok(spec.target);
  assert.ok(spec.fields.length > 0);
  assert.strictEqual(validateRequest(spec.caseId, spec.fields).valid, true);
}

const incomplete = validateRequest('006', ['eligible-call universe', 'ANCHOR assignment/response timing']);
assert.strictEqual(incomplete.valid, false);
assert.ok(incomplete.missing.includes('defensible comparator/design'));

const aseIncomplete = validateRequest('009', [
  'activation/deactivation and uptime', 'site/date speed observations',
  'collision severity/site linkage', 'traffic exposure denominator', 'complete treatment history'
]);
assert.strictEqual(aseIncomplete.valid, false);
assert.ok(aseIncomplete.missing.includes('concurrent intervention history'));

const shelterIncomplete = validateRequest('014', [
  'site/date bed inventory', 'capacity changes', 'occupancy/admissions',
  'exit outcome/follow-up', 'comparison or capacity-shock design',
  'eligibility/placement changes', 'concurrent program changes'
]);
assert.strictEqual(shelterIncomplete.valid, false);
assert.ok(shelterIncomplete.missing.includes('marginal bed-night exposure'));

console.log('RC4 evidence acquisition specification tests passed');
