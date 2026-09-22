'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const BASE_URL = (process.env.VIDIK_BASE_URL || 'https://vidik-staging.onrender.com').replace(/\/$/, '');

const CASES = [
  ['reduce violent crime', 'municipal', 'CA'],
  ['reduce homelessness', 'municipal', 'CA'],
  ['reduce pedestrian injuries', 'municipal', 'CA'],
  ['reduce food insecurity', 'community', 'CA'],
  ['reduce extreme heat illness', 'municipal', 'US'],
  ['reduce worker displacement', 'enterprise', 'US'],
  ['reduce construction permitting delays', 'business', 'CA'],
  ['improve small business survival', 'business', 'US'],
  ['reduce digital access gaps', 'enterprise', 'UK'],
  ['reduce urban noise pollution', 'municipal', 'UK']
];

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    return await fetch(BASE_URL + path, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function json(response) {
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { throw new Error(`non-json response: HTTP ${response.status}: ${text.slice(0, 300)}`); }
  return body;
}

test('deployed VIDIK is healthy and database-ready', async () => {
  const response = await request('/ready');
  assert.equal(response.status, 200);
  const body = await json(response);
  assert.equal(body.ready, true);
  assert.equal(body.status, 'ok');
  assert.equal(body.service, 'vidik');
  assert.equal(body.database?.reachable, true);
  assert.equal(body.database?.schemaReady, true);
  console.log(JSON.stringify({ health: 'ready', version: body.version, database: body.database }));
});

test('deployed VIDIK discovers arbitrary real-world problems through the live API', async () => {
  const summaries = [];
  for (const [problem, audience, jurisdiction] of CASES) {
    const response = await request('/api/decision/discover', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ problem, audience, jurisdiction, statusQuo: 'Continue current practice' })
    });
    assert.equal(response.status, 200, `${jurisdiction}/${audience}/${problem}: HTTP ${response.status}`);
    const body = await json(response);

    assert.equal(body.problem, problem);
    assert.ok(body.runHash && typeof body.runHash === 'string', `${problem}: missing run hash`);
    assert.equal(body.governance?.recommendationAllowed, false, `${problem}: live discovery must remain evidence/governance gated`);
    assert.equal(body.governance?.whyNotAvailable, true, `${problem}: missing why-not boundary`);
    assert.ok(Array.isArray(body.candidates), `${problem}: candidates must be an array`);
    assert.ok(body.candidates.length > 0, `${jurisdiction}/${audience}/${problem}: live candidate universe is empty`);
    assert.ok(body.candidates.every(c => c.discovery?.leadOnly === true), `${problem}: non-lead candidate crossed discovery boundary`);
    assert.ok(body.candidates.every(c => c.discovery?.effectsImported === false), `${problem}: discovery imported an effect`);
    assert.ok(Array.isArray(body.evidenceSearches), `${problem}: evidence searches missing`);
    assert.ok(body.decision && typeof body.decision === 'object', `${problem}: decision object missing`);

    summaries.push({
      problem,
      audience,
      jurisdiction,
      candidates: body.candidates.length,
      evidenceSearches: body.evidenceSearches.length,
      recommendationAllowed: body.governance.recommendationAllowed,
      decisionStatus: body.governance.decisionStatus
    });
  }
  console.log(JSON.stringify({ liveArbitraryProblemCertification: 'passed', baseUrl: BASE_URL, cases: summaries }, null, 2));
});
