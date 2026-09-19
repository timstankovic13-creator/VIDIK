'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const EvidenceDriven = require('../js/source-driven-evidence-discovery');
const SourceDriven = require('../js/source-driven-intervention-discovery');

function response(value) { const bytes = Buffer.from(JSON.stringify(value)); return { ok: true, status: 200, headers: { get: name => name === 'content-type' ? 'application/json' : null }, arrayBuffer: async () => bytes }; }

test('evidence discovery searches independent sources per candidate and imports no effects', async () => {
  const candidate = { id: 'candidate:1', name: 'community violence interruption', discoveryText: 'violence prevention', requiredEvidence: ['causal'] };
  const run = await EvidenceDriven.discoverCandidateEvidence({ problem: 'reduce violent crime', candidate, fetchImpl: async url => response(url.includes('openalex') ? { results: [{ id: 'W1', display_name: 'Study of violence interruption' }] } : url.includes('esummary') ? { result: { '12345': { uid: '12345', title: 'Violence interruption evaluation for violent crime' } } } : { esearchresult: { idlist: ['12345'] } }) });
  assert.equal(run.evidenceLeads.length, 2);
  assert.equal(run.evidenceComplete, false);
  assert.equal(run.recommendationEligible, false);
  assert.equal(run.effectsImported, false);
  assert.ok(run.discoveryHash);
});

test('arbitrary unmatched problems use broad intervention catalogue fallback and audit it', () => {
  const audit = SourceDriven.buildApplicabilityAudit({ problem: 'reduce asteroid impact risk', jurisdiction: 'CA' });
  assert.equal(audit.fallbackUsed, true);
  assert.equal(audit.decision, 'broad-fallback');
  assert.ok(audit.consideredCount > 0);
  assert.ok(SourceDriven.selectInterventionSources({ problem: 'reduce asteroid impact risk', jurisdiction: 'CA' }).length > 0);
});
