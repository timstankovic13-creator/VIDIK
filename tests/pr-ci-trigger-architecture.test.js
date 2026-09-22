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


test('Insight Quality gates run before expensive downstream certification', () => {
  const workflow = fs.readFileSync(path.join(workflowDir, 'intelligence-completion-v1.yml'), 'utf8');
  const stepNames = [...workflow.matchAll(/^\s*- name: (.+)$/gm)].map(match => match[1].trim());
  const position = name => stepNames.indexOf(name);
  const fast = position('Insight Quality fast preflight');
  const universe = position('Intervention universe hardening');
  const relevance = position('Intervention relevance scenario battery');
  const battery = position('Insight Quality Battery (60 real-world decision problems)');
  const evidence = position('Evidence sufficiency hardening');
  assert.ok(fast >= 0 && universe >= 0 && relevance >= 0 && battery >= 0 && evidence >= 0);
  assert.ok(fast < universe && universe < relevance && relevance < battery && battery < evidence);
});
