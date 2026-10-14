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
  assert.equal(run.evidenceComplete, true);
  assert.equal(run.recommendationEligible, false);
  assert.equal(run.effectsImported, false);
  assert.ok(run.discoveryHash);
});

test('bounded evidence source selection pairs general and biomedical problems with the right independent indexes', async () => {
  const fetchImpl = async url => {
    if (url.includes('openalex')) return response({ results: [] });
    if (url.includes('api.crossref.org')) return response({ message: { items: [] } });
    return response({ esearchresult: { idlist: [] } });
  };
  const general = await EvidenceDriven.discoverCandidateEvidence({
    problem: 'reduce procurement cycle time',
    candidate: { id: 'candidate:general', name: 'workflow redesign', interventionFamily: ['regulatory'], discoveryText: 'process improvement' },
    maxSources: 2, maxQueriesPerSource: 1, fetchImpl
  });
  assert.deepEqual(general.sourceSearches.map(source => source.sourceId), ['openalex-works', 'crossref-works']);

  const biomedical = await EvidenceDriven.discoverCandidateEvidence({
    problem: 'reduce opioid overdose deaths',
    candidate: { id: 'candidate:health', name: 'harm reduction outreach', interventionFamily: ['public-safety'], discoveryText: 'community safety response' },
    maxSources: 2, maxQueriesPerSource: 1, fetchImpl
  });
  assert.deepEqual(biomedical.sourceSearches.map(source => source.sourceId), ['openalex-works', 'pubmed-eutils']);
});

test('arbitrary unmatched problems use broad intervention catalogue fallback and audit it', () => {
  const audit = SourceDriven.buildApplicabilityAudit({ problem: 'reduce asteroid impact risk', jurisdiction: 'CA' });
  assert.equal(audit.fallbackUsed, true);
  assert.equal(audit.decision, 'broad-fallback');
  assert.ok(audit.consideredCount > 0);
  assert.ok(SourceDriven.selectInterventionSources({ problem: 'reduce asteroid impact risk', jurisdiction: 'CA' }).length > 0);
});

test('evidence discovery propagates caller abort instead of continuing source queries', async () => {
  const candidate = { id: 'candidate:abort', name: 'community violence interruption', discoveryText: 'violence prevention' };
  const controller = new AbortController();
  let markStarted;
  const started = new Promise(resolve => { markStarted = resolve; });
  const pending = EvidenceDriven.discoverCandidateEvidence({
    problem: 'reduce violent crime',
    candidate,
    signal: controller.signal,
    fetchImpl: (_url, options) => new Promise((resolve, reject) => {
      markStarted();
      options.signal.addEventListener('abort', () => reject(options.signal.reason || new Error('aborted')), { once: true });
    })
  });
  await started;
  const reason = new Error('baseline-test-cancelled');
  controller.abort(reason);
  await assert.rejects(pending, error => error === reason || error.message === reason.message);
});
