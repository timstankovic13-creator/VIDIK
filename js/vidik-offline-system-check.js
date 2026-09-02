'use strict';

const assert = require('node:assert/strict');
const { runDecisionWorkflow } = require('./vidik-canonical-decision-workflow');
const { CASES, minimumRequest } = require('./rc4-evidence-acquisition-spec');
const { requestGate } = require('./rc4-evidence-request-gate');
const { runBenchmark } = require('./vidik-decision-benchmark-runner');

function runOfflineSystemCheck() {
  const results = [];
  const check = (name, fn) => {
    try { fn(); results.push({ name, status: 'PASS' }); }
    catch (error) { results.push({ name, status: 'FAIL', error: error.message }); }
  };

  check('historical freeze', () => {
    const r = runDecisionWorkflow({ decisionId: 'hist-001', decisionDate: '2023-12-06', historical: true, evidenceAdmissible: true, modelReady: true, counterfactualReady: true, recommendation: 'act' });
    assert.equal(r.status, 'NO_RECOMMENDATION');
    assert.equal(r.recommendation, null);
  });

  check('post-boundary canonical recommendation gate', () => {
    const r = runDecisionWorkflow({ decisionId: 'live-001', decisionDate: '2026-09-02', evidenceAdmissible: true, modelReady: true, counterfactualReady: true, recommendation: 'act' });
    assert.equal(r.status, 'RECOMMENDATION_READY');
    assert.equal(r.recommendation, 'act');
  });

  check('evidence request exactness', () => {
    for (const caseId of Object.keys(CASES)) assert.equal(requestGate(caseId, minimumRequest(caseId).fields).sendRequest, true);
  });

  check('evidence request fail-closed', () => {
    for (const caseId of Object.keys(CASES)) assert.equal(requestGate(caseId, []).sendRequest, false);
  });

  check('benchmark execution', () => {
    const result = runBenchmark();
    assert.ok(result && result.cases && result.cases.length > 0);
  });

  const failed = results.filter(r => r.status === 'FAIL');
  return Object.freeze({ status: failed.length ? 'FAIL' : 'PASS', results: Object.freeze(results), passed: results.length - failed.length, failed: failed.length });
}

if (require.main === module) {
  const result = runOfflineSystemCheck();
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 'PASS') process.exitCode = 1;
}

module.exports = { runOfflineSystemCheck };
