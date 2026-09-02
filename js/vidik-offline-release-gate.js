const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TESTS = [
  'tests/rc4-evidence-acquisition-spec.test.js',
  'tests/rc4-evidence-request-gate.test.js',
  'tests/vidik-adversarial-reproducibility.test.js'
];

function runTest(file) {
  const result = spawnSync(process.execPath, [path.join(ROOT, file)], {
    cwd: ROOT,
    encoding: 'utf8'
  });
  return {
    file,
    passed: result.status === 0,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

function runOfflineReleaseGate() {
  const results = TESTS.map(runTest);
  const failed = results.filter(r => !r.passed);
  const summary = {
    mode: 'OFFLINE_RELEASE_GATE',
    ciRequired: false,
    tests: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    status: failed.length === 0 ? 'PASS' : 'BLOCKED'
  };
  return { summary, results };
}

if (require.main === module) {
  const report = runOfflineReleaseGate();
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.summary.status === 'PASS' ? 0 : 1;
}

module.exports = { TESTS, runTest, runOfflineReleaseGate };
