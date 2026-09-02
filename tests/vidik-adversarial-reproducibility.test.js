const assert = require('node:assert/strict');
const { runDecisionWorkflow } = require('../js/vidik-canonical-decision-workflow');
const { assessRequest, requestGate } = require('../js/rc4-evidence-request-gate');

const historical = runDecisionWorkflow({ decisionId:'adv-001', question:'q', decisionDate:'2023-12-06', historical:true, evidenceDate:'2023-12-07', evidenceAdmissible:true, modelReady:true, counterfactualReady:true, recommendation:'act' });
assert.equal(historical.status, 'NO_RECOMMENDATION');

const incomplete = assessRequest('009', ['activation/deactivation dates and uptime']);
assert.equal(incomplete.requestable, false);
assert.ok(incomplete.missing.length > 0);
assert.equal(requestGate('009', ['activation/deactivation dates and uptime']).sendRequest, false);

const exactFields = require('../js/rc4-evidence-acquisition-spec').minimumRequest('010');
const exact = assessRequest('010', exactFields);
assert.equal(exact.sendRequest, undefined);
assert.equal(exact.requestable, false);
const exactGate = requestGate('010', require('../js/rc4-evidence-acquisition-spec').CASES['010'].required);
assert.equal(exactGate.sendRequest, true);
const extra = assessRequest('010', [...require('../js/rc4-evidence-acquisition-spec').CASES['010'].required, 'interesting_extra']);
assert.equal(extra.requestable, false);

const input = { decisionId:'adv-002', question:'q', decisionDate:'2026-09-02', resourceUnit:'crew-hour', evidenceAdmissible:true, modelReady:true, counterfactualReady:true, recommendation:'act', why:'test' };
assert.deepEqual(runDecisionWorkflow(input), runDecisionWorkflow(input));
console.log('VIDIK adversarial/reproducibility tests passed');
