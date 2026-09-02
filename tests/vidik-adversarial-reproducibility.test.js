const assert = require('node:assert/strict');
const { runDecisionWorkflow } = require('../js/vidik-canonical-decision-workflow');
const { assessRequest } = require('../js/rc4-evidence-request-gate');

const historical = runDecisionWorkflow({ decisionId:'adv-001', question:'q', decisionDate:'2023-12-06', resourceUnit:'site-month', historical:true, evidenceDate:'2023-12-07', evidenceAdmissible:true, modelReady:true, counterfactualReady:true, recommendation:'act' });
assert.equal(historical.status, 'NO_RECOMMENDATION');

const incomplete = assessRequest('009', ['activation/deactivation dates and uptime']);
assert.equal(incomplete.sendRequest, false);
assert.ok(incomplete.missing.length > 0);

const exactFields = require('../js/rc4-evidence-acquisition-spec').minimumRequest('010');
const exact = assessRequest('010', exactFields);
assert.equal(exact.sendRequest, true);
const extra = assessRequest('010', [...exactFields, 'interesting_extra']);
assert.equal(extra.sendRequest, false);

const input = { decisionId:'adv-002', question:'q', decisionDate:'2026-09-02', resourceUnit:'crew-hour', evidenceAdmissible:true, modelReady:true, counterfactualReady:true, recommendation:'act', why:'test' };
assert.deepEqual(runDecisionWorkflow(input), runDecisionWorkflow(input));
console.log('VIDIK adversarial/reproducibility tests passed');
