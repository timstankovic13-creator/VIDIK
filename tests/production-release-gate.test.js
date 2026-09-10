'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));

const requiredFiles = [
  'index.html','package.json','SECURITY.md','infra/PRODUCTION_DEPLOYMENT.md',
  'js/city-source-adapters.js','js/municipal-decision-context.js','js/municipal-decision-mapping.js',
  'js/decision-intelligence-9.2-integration.js','js/decision-intelligence-9.7.js','js/decision-intelligence-9.7-browser.js',
  'js/decision-artifact-store.js','js/decision-integrity-9.4.js','js/decision-lifecycle-9.6.js',
  'js/vidik-production-hardening-16.js','scripts/outcome-learning.js',
  'tests/municipal-evidence-pipeline.test.js','tests/municipal-semantic-decision-gates.test.js',
  'tests/decision-intelligence-9.7.test.js','tests/canonical-decision-intelligence.test.js','tests/outcome-learning.test.js',
  'tests/production-config.test.js','tests/hostile-engine-and-production-readiness-15.test.js',
  'tests/vidik-production-hardening-16.test.js','tests/e2e/decision-intelligence-9.7-browser.spec.js'
];
for (const file of requiredFiles) assert.ok(exists(file), `missing required production file: ${file}`);

const pkg = JSON.parse(read('package.json'));
for (const script of [
  'test:e2e','test:municipal-contracts','test:municipal-live','test:municipal-production',
  'test:municipal-operational-lifecycle','test:municipal-retrospective-shadow','test:municipal-ingestion',
  'test:municipal-evidence-pipeline','test:municipal-semantic-gates','test:decision-intelligence',
  'test:production-hardening-16','test:outcome-learning','test:production-config','test:hostile-readiness','test:production-release-gate'
]) assert.ok(pkg.scripts[script], `missing npm release-gate script: ${script}`);

const html = read('index.html');
for (const id of ['city','pool','risk','readinessCity','readinessCountry','readinessLimit','recordOutcome','recalculateModel','persistDecision','snapshotDecision','applyOverride','verifyDecision','v96ReviewOutcome','v96Recalibrate','v96DetectDrift','runAcceptance']) {
  assert.match(html, new RegExp(`(?:id|data-[a-z-]+)=['"]${id}['"]`), `missing production UI control: ${id}`);
}
for (const script of ['js/geography-reconciliation.js','js/city-source-adapters.js','js/municipal-decision-context.js','js/municipal-decision-mapping.js','js/decision-intelligence-9.2-integration.js','js/decision-integrity-9.4.js','js/decision-lifecycle-9.6.js']) {
  assert.ok(html.includes(script), `canonical UI does not load ${script}`);
}

const config = read('js/config.js');
assert.ok(config.includes('decision-intelligence-9.7-browser.js'));
const browserSpec = read('tests/e2e/decision-intelligence-9.7-browser.spec.js');
assert.match(browserSpec, /2000/);
assert.match(browserSpec, /paramedic/);

const fullRegression = read('.github/workflows/9-3-full-regression.yml');
assert.match(fullRegression, /node-version:\s*24/);
assert.match(fullRegression, /set -euo pipefail/);
assert.match(fullRegression, /npx playwright install chromium/);
for (const script of ['test:production-release-gate','test:municipal-contracts','test:municipal-ingestion','test:municipal-live','test:municipal-production','test:municipal-operational-lifecycle','test:municipal-retrospective-shadow','test:municipal-evidence-pipeline','test:municipal-semantic-gates','test:decision-intelligence','test:production-hardening-16','test:outcome-learning','test:production-config','test:hostile-readiness']) {
  assert.ok(fullRegression.includes(`npm run ${script}`), `full regression does not execute ${script}`);
}
const productionGate = read('.github/workflows/municipal-production-gate.yml');
assert.match(productionGate, /node-version:\s*['"]?24['"]?/);
assert.match(productionGate, /test:hostile-readiness/);
console.log('production-release-gate: PASS');
