const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const workflowDir = path.join(process.cwd(), '.github', 'workflows');
const canonicalPrWorkflows = new Set([
  'intelligence-completion-v1.yml',
  'pr-ci-orchestrator.yml'
]);

test('PR CI trigger architecture has one canonical test gate plus orchestrator', () => {
  const files = fs.readdirSync(workflowDir).filter((name) => name.endsWith('.yml'));
  const offenders = [];

  for (const file of files) {
    const text = fs.readFileSync(path.join(workflowDir, file), 'utf8');
    const hasPullRequestTrigger = /(^|\n)\s*pull_request\s*:/m.test(text) || /on:\s*\[[^\]]*pull_request\b/.test(text);
    if (hasPullRequestTrigger && !canonicalPrWorkflows.has(file)) {
      offenders.push(file);
    }
  }

  assert.deepEqual(offenders, [], `duplicate PR-triggered workflows remain: ${offenders.join(', ')}`);
});
