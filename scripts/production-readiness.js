'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { validateProductionConfig } = require('./production-config');

const REQUIRED_REPOSITORY_CONTROLS = Object.freeze([
  'SECURITY.md',
  'infra/PRODUCTION_DEPLOYMENT.md',
  'scripts/production-config.js',
  'js/decision-artifact-store.js',
  'scripts/outcome-learning.js',
  'scripts/operational-governance.js',
  'scripts/audit-replay-export.js',
]);

function repositoryReadiness(root = path.resolve(__dirname, '..')) {
  const missing = REQUIRED_REPOSITORY_CONTROLS.filter(file => !fs.existsSync(path.join(root, file)));
  return Object.freeze({ ok: missing.length === 0, missing, controls: REQUIRED_REPOSITORY_CONTROLS });
}

function environmentReadiness(env = process.env) {
  try {
    return Object.freeze({ ok: true, config: validateProductionConfig(env) });
  } catch (error) {
    return Object.freeze({ ok: false, code: error.code || 'production-config-invalid', detail: error.message });
  }
}

function evaluateProductionReadiness(options = {}) {
  const repo = repositoryReadiness(options.root);
  const environment = environmentReadiness(options.env);
  const ok = repo.ok && environment.ok;
  return Object.freeze({ ok, repository: repo, environment });
}

if (require.main === module) {
  const result = evaluateProductionReadiness();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}

module.exports = { REQUIRED_REPOSITORY_CONTROLS, repositoryReadiness, environmentReadiness, evaluateProductionReadiness };
