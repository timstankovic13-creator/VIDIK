'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');

let child;
let base;

async function waitForReady(url) {
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('staging-server-did-not-start');
}

test.before(async () => {
  const port = 18765;
  base = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ['staging/server.js'], { env: { ...process.env, PORT: String(port), VIDIK_DATABASE_URL: '' }, stdio: 'pipe' });
  await waitForReady(`${base}/health`);
});

test.after(() => child?.kill('SIGTERM'));

test('business workspace can actually submit a decision to the production discovery endpoint', async () => {
  const response = await fetch(`${base}/api/decision/discover`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      problem: 'improve small business survival',
      jurisdiction: 'US',
      audience: 'business',
      statusQuo: 'Continue current practice'
    })
  });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.problem, 'improve small business survival');
  assert.ok(['recommendation-ready', 'recommendation-blocked'].includes(result.status));
  assert.ok(result.runHash);
  assert.equal(result.governance.recommendationAllowed, false);
  assert.ok(Array.isArray(result.candidates));
  assert.ok(Array.isArray(result.evidenceSearches));
  assert.equal(result.governance.learningLeadOnly ?? true, true);
});

test('general decision endpoint rejects malformed requests instead of guessing', async () => {
  const response = await fetch(`${base}/api/decision/discover`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({})
  });
  const result = await response.json();
  assert.equal(response.status, 400);
  assert.equal(result.status, 'error');
  assert.equal(result.error, 'decision-problem-required');
});
