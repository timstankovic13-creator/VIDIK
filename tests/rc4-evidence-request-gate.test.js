'use strict';

const assert = require('assert');
const { CASES } = require('../js/rc4-evidence-acquisition-spec');
const { assessRequest, requestGate } = require('../js/rc4-evidence-request-gate');

for (const caseId of Object.keys(CASES)) {
  const fields = CASES[caseId].required;
  const exact = assessRequest(caseId, fields);
  assert.strictEqual(exact.requestable, true);
  assert.deepStrictEqual(exact.missing, []);
  assert.deepStrictEqual(exact.unnecessary, []);

  const extra = assessRequest(caseId, [...fields, 'interesting-but-noncritical-data']);
  assert.strictEqual(extra.requestable, false);
  assert.deepStrictEqual(extra.unnecessary, ['interesting-but-noncritical-data']);
}

const partial = requestGate('010', CASES['010'].required.slice(0, -1));
assert.strictEqual(partial.sendRequest, false);
assert.strictEqual(partial.status, 'SPEC_INCOMPLETE');
assert.ok(partial.missing.includes('untreated/pre-treatment comparison history'));

console.log('RC4 evidence request gate tests passed');
