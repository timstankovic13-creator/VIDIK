'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { buildPubMedSearchUrl, buildPubMedSummaryUrl, extractPubMedLeads, discoverPubMedLeads } = require('../js/research-discovery');

function response(payload) {
  const bytes = Buffer.from(JSON.stringify(payload));
  return {
    ok: true,
    status: 200,
    headers: { get: name => name.toLowerCase() === 'content-type' ? 'application/json' : String(bytes.length) },
    arrayBuffer: async () => bytes
  };
}

test('PubMed search URL is HTTPS, bounded, and query-specific', () => {
  const url = new URL(buildPubMedSearchUrl({ problem: 'violent crime', outcome: 'homicide', perPage: 10 }));
  assert.equal(url.protocol, 'https:');
  assert.equal(url.hostname, 'eutils.ncbi.nlm.nih.gov');
  assert.equal(url.searchParams.get('db'), 'pubmed');
  assert.equal(url.searchParams.get('retmode'), 'json');
  assert.equal(url.searchParams.get('retmax'), '10');
  assert.ok(url.searchParams.get('term').includes('violent crime'));
  assert.equal(new URL(buildPubMedSummaryUrl(['123', '456'])).hostname, 'eutils.ncbi.nlm.nih.gov');
});

test('PubMed leads are potential evidence only and retain stable identifiers', () => {
  const leads = extractPubMedLeads({ result: { uids: ['123'], '123': { title: 'Violence prevention', pubdate: '2025 Jan', fulljournalname: 'Journal of Safety', authors: [{ name: 'A Author' }] } } });
  assert.equal(leads.length, 1);
  assert.equal(leads[0].id, 'https://pubmed.ncbi.nlm.nih.gov/123/');
  assert.equal(leads[0].evidenceStatus, 'potential');
  assert.equal(leads[0].authors[0], 'A Author');
});

test('PubMed adapter records retrieval provenance for both search and summary snapshots', async () => {
  const calls = [];
  const fetchImpl = async url => {
    calls.push(url);
    if (url.includes('esearch.fcgi')) return response({ esearchresult: { idlist: ['123'] } });
    return response({ result: { uids: ['123'], '123': { title: 'Violence prevention', pubdate: '2025', source: 'Safety Journal', authors: [] } } });
  };
  const result = await discoverPubMedLeads({ problem: 'violent crime', fetchImpl, now: new Date('2026-09-14T00:00:00Z'), perPage: 5 });
  assert.equal(calls.length, 2);
  assert.equal(result.leads.length, 1);
  assert.equal(result.source.provider, 'U.S. National Library of Medicine / NCBI');
  assert.ok(result.source.search.contentHash);
  assert.ok(result.source.summary.contentHash);
  assert.ok(result.discoveryHash);
});
