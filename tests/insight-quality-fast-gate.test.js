'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { discoverCandidateEvidence } = require('../js/source-driven-evidence-discovery');

test('fast insight-quality evidence gate: bounded ladder preserves independent providers', async () => {
  const candidate = { id: 'candidate:fast-gate-violence', name: 'Focused Deterrence', discoveryText: 'focused deterrence group violence intervention', interventionFamily: ['public-safety'] };
  const result = await discoverCandidateEvidence({ problem: 'reduce violent crime', candidate, fetchImpl: async url => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, arrayBuffer: async () => Buffer.from(url.includes('eutils.ncbi.nlm.nih.gov') ? JSON.stringify({ esearchresult: { idlist: ['1'] } }) : JSON.stringify({ results: [{ id: 'W1', display_name: 'Focused Deterrence Group Violence Intervention' }] })) }) });
  assert.ok(result.diversifiedQueries.length <= 10);
  assert.ok(result.sourceSearches.some(s => s.sourceId === 'openalex-works'));
  assert.ok(result.sourceSearches.some(s => s.sourceId === 'pubmed-eutils'));
  assert.ok(result.sourceDiagnostics['openalex-works']);
  assert.ok(result.sourceDiagnostics['pubmed-eutils']);
});
