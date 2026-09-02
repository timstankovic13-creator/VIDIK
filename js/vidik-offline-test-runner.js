'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const TEST_DIR = path.resolve(__dirname, '../tests');
const BROWSER_RE = /@playwright\/test|\bplaywright\b|browser acceptance|e2e/i;

function discoverTests(dir = TEST_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.test.js'))
    .map(entry => path.join(dir, entry.name))
    .sort();
}

function runOfflineTests() {
  const results = discoverTests().map(file => {
    const relative = path.relative(process.cwd(), file);
    const source = fs.readFileSync(file, 'utf8');
    if (BROWSER_RE.test(source) || /browser|e2e/i.test(path.basename(file))) {
      return { file: relative, status: 'BLOCKED', reason: 'Browser/e2e test requires unavailable external runtime.' };
    }
    const result = spawnSync(process.execPath, [file], { encoding: 'utf8' });
    if (result.status === 0) return { file: relative, status: 'PASS', output: result.stdout.trim() };
    const detail = (result.stderr || result.stdout || `exit ${result.status}`).trim().slice(-1000);
    return { file: relative, status: 'FAIL', error: detail };
  });

  const counts = results.reduce((out, result) => {
    out[result.status] = (out[result.status] || 0) + 1;
    return out;
  }, {});
  const status = (counts.FAIL || 0) > 0 ? 'FAIL' : 'PASS';
  return Object.freeze({ status, results: Object.freeze(results), counts: Object.freeze(counts), discovered: results.length });
}

if (require.main === module) {
  const result = runOfflineTests();
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'FAIL') process.exitCode = 1;
}

module.exports = { discoverTests, runOfflineTests };
