'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

// This is deliberately a deterministic, dependency-free release gate. It catches
// missing production pieces before GitHub's expensive browser/regression jobs run.
const requiredFiles = [
  'index.html',
  'package.json',
  'SECURITY.md',
  'infra/PRODUCTION_DEPLOYMENT.md',
  'js/city-source-adapters.js',
  'js/municipal-decision-context.js',
  'js/decision-integrity-9.4.js',
  'js/decision-lifecycle-9.6.js',
  'tests/municipal-evidence-pipeline.test.js',
  'tests/outcome-learning.test.js',
  'tests/production-config.test.js',
  'tests/hostile-engine-and-production-readiness-15.test.js'
];
for (const file of requiredFiles) assert.ok(exists(file), `missing required production file: ${file}`);

const pkg = JSON.parse(read('package.json'));
const requiredScripts = [
  'test:e2e',
  'test:municipal-contracts',
  'test:municipal-live',
  'test:municipal-production',
  'test:municipal-operational-lifecycle',
  'test:municipal-retrospective-shadow',
  'test:municipal-ingestion',
  'test:municipal-evidence-pipeline',
  'test:outcome-learning',
  'test:production-config',
  'test:hostile-readiness',
  'test:production-release-gate'
];
for (const script of requiredScripts) assert.ok(pkg.scripts[script], `missing npm release-gate script: ${script}`);

const html = read('index.html');
const requiredControls = [
  'city', 'pool', 'risk', 'readinessCity', 'readinessCountry', 'readinessLimit',
  'recordOutcome', 'recalculateModel', 'persistDecision', 'snapshotDecision',
  'applyOverride', 'verifyDecision', 'v96ReviewOutcome', 'v96Recalibrate',
  'v96DetectDrift', 'runAcceptance'
];
for (const id of requiredControls) assert.match(html, new RegExp(`(?:id|data-[a-z-]+)=['"]${id}['"]`), `missing production UI control: ${id}`);

// WUP/readiness and municipal decision paths must be loaded by the canonical UI.
for (const script of [
  'js/geography-reconciliation.js',
  'js/city-source-adapters.js',
  'js/municipal-decision-context.js',
  'js/decision-intelligence-9.2-integration.js',
  'js/decision-integrity-9.4.js',
  'js/decision-lifecycle-9.6.js'
]) assert.match(html, new RegExp(script.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `canonical UI does not load ${script}`);

const fullRegression = read('.github/workflows/9-3-full-regression.yml');
assert.match(fullRegression, /node-version:\s*24/);
assert.match(fullRegression, /set -euo pipefail/);
assert.match(fullRegression, /npx playwright install --with-deps chromium/);
for (const script of [
  'test:production-release-gate',
  'test:municipal-contracts',
  'test:municipal-ingestion',
  'test:municipal-live',
  'test:municipal-production',
  'test:municipal-operational-lifecycle',
  'test:municipal-retrospective-shadow',
  'test:municipal-evidence-pipeline',
  'test:outcome-learning',
  'test:production-config',
  'test:hostile-readiness'
]) assert.match(fullRegression, new RegExp(`npm run ${script.replace(':', '\\:')}`), `full regression does not execute ${script}`);

const productionGate = read('.github/workflows/municipal-production-gate.yml');
assert.match(productionGate, /node-version:\s*['"]?24['"]?/);
assert.match(productionGate, /test:hostile-readiness/);

console.log('production-release-gate: PASS');
