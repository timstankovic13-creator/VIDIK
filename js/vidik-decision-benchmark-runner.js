'use strict';

const fs = require('fs');
const path = require('path');
const { runDecisionWorkflow } = require('./vidik-canonical-decision-workflow');

const benchmarkPath = path.resolve(__dirname, '../data/VIDIK_DECISION_BENCHMARK_v1.json');

function runBenchmark() {
  const benchmark = JSON.parse(fs.readFileSync(benchmarkPath, 'utf8'));
  const results = benchmark.cases.map(testCase => {
    const input = { ...testCase };
    for (const key of ['id', 'mode', 'expectedStatus', 'expectedRecommendation', 'reason']) delete input[key];
    const actual = runDecisionWorkflow(input);
    const pass = actual.status === testCase.expectedStatus && actual.recommendation === testCase.expectedRecommendation;
    return Object.freeze({ id: testCase.id, pass, expectedStatus: testCase.expectedStatus, actualStatus: actual.status, expectedRecommendation: testCase.expectedRecommendation, actualRecommendation: actual.recommendation });
  });
  const failed = results.filter(r => !r.pass);
  return Object.freeze({ benchmark: benchmark.benchmark, version: benchmark.version, cases: results.length, passed: results.length - failed.length, failed: failed.length, status: failed.length ? 'BLOCKED' : 'PASS', results: Object.freeze(results) });
}

if (require.main === module) {
  const result = runBenchmark();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === 'PASS' ? 0 : 1;
}

module.exports = { runBenchmark };
