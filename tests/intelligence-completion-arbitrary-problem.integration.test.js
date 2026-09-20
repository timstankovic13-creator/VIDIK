'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { discoverSourceDrivenInterventions } = require('../js/source-driven-intervention-discovery');
const { discoverCandidateEvidence } = require('../js/source-driven-evidence-discovery');
const CA = { sourceId: 'ca-program-discovery', jurisdiction: 'CA', domain: 'intervention-universe', url: 'https://open.canada.ca/data/en/api/3/action/package_search?q=' };
const OPENALEX = { sourceId: 'openalex-works', jurisdiction: 'international', domain: 'causal-evidence', url: 'https://api.openalex.org/works?search=' };
const PUBMED = { sourceId: 'pubmed-eutils', jurisdiction: 'US', domain: 'causal-evidence', url: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=' };
function response(value) { const bytes = Buffer.from(JSON.stringify(value)); return { ok: true, status: 200, headers: { get: k => k === 'content-type' ? 'application/json' : null }, arrayBuffer: async () => bytes }; }

test('arbitrary problem produces a bounded candidate universe then evidence leads without recommendation leakage', async () => {
  const discovery = await discoverSourceDrivenInterventions({ problem: 'reduce extreme heat illness', jurisdiction: 'CA', sources: [CA], fetchImpl: async () => response({ result: { results: [
    { id: 'cooling', title: 'Community cooling centre emergency response service', notes: 'Seasonal heat-response service.' },
    { id: 'data', title: 'Extreme Heat Statistics Dataset', notes: 'Observed heat illness counts.' },
    { id: 'shade', title: 'Shade infrastructure program', notes: 'Public cooling infrastructure.' }
  ] } }) });
  assert.deepEqual(discovery.candidates.map(c => c.name).sort(), ['Community cooling centre emergency response service','Shade infrastructure program'].sort());
  assert.ok(discovery.candidates.every(c => c.discovery.leadOnly && !c.discovery.effectsImported));
  assert.ok(discovery.interventionUniverse.interventionFamilies.length >= 1);
  assert.equal(discovery.recommendationEligible, false);
  const evidence = await discoverCandidateEvidence({ problem: 'reduce extreme heat illness', candidate: discovery.candidates[0], sources: [OPENALEX, PUBMED], fetchImpl: async url => url.includes('openalex') ? response({ results: [{ id: 'W1', display_name: `${discovery.candidates[0].name} evaluation` }] }) : url.includes('esummary') ? response({ result: { '12345': { uid: '12345', title: `${discovery.candidates[0].name} evaluation for extreme heat illness` } } }) : response({ esearchresult: { idlist: ['12345'] } }) });
  assert.deepEqual([...new Set(evidence.sourceSearches.filter(s => s.status === 'evidence-leads-found').map(s => s.sourceId))].sort(), ['openalex-works','pubmed-eutils'].sort());
  assert.ok(evidence.evidenceLeads.length >= 2);
  assert.deepEqual([...new Set(evidence.evidenceLeads.filter(l => l.relevanceStatus === 'candidate-match' || l.relevanceStatus === 'verified').map(l => l.sourceId))].sort(), ['openalex-works','pubmed-eutils'].sort());
  assert.equal(evidence.evidenceSufficiency.recommendationEligible, false);
  assert.equal(evidence.effectsImported, false);
});
