const assert = require('node:assert/strict');
const { runDecisionWorkflow } = require('../js/vidik-canonical-decision-workflow');
const { assessRequest } = require('../js/rc4-evidence-request-gate');

// Historical leakage must fail closed.
const historical = runDecisionWorkflow({ decisionId:'adv-001', question:'q', decisionDate:'2023-12-06', resourceUnit:'site-month', historical:true, evidenceDate:'2023-12-07', evidenceAdmissible:true, modelReady:true, counterfactualReady:true, recommendation:'act' });
assert.equal(historical.status, 'NO_RECOMMENDATION');

// Missing causal evidence cannot be promoted through the request gate.
const missing = assessRequest('009', ['activation/deactivation dates and uptime']);
assert.equal(missing.sendRequest, false);
assert.ok(missing.missing.length > 0);

// Exact frozen package is requestable; an extra field is not.
const exact = assessRequest('010');
assert.equal(exact.sendRequest, true);
const extra = assessRequest('010', [...exact.required, 'interesting_extra']);
assert.equal(extra.sendRequest, false);

// Deterministic rerun of identical input.
const input = { decisionId:'adv-002', question:'q', decisionDate:'2026-09-02', resourceUnit:'crew-hour', evidenceAdmissible:true, modelReady:true, counterfactualReady:true, recommendation:'act', why:'test' };
assert.deepEqual(runDecisionWorkflow(input), runDecisionWorkflow(input));
console.log('VIDIK adversarial/reproducibility tests passed');
