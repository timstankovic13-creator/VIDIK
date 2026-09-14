'use strict';

const { retrieve, parsePayload, sha256 } = require('./data-acquisition');

const OPENALEX_SOURCE = Object.freeze({
  sourceId: 'openalex-works', provider: 'OpenAlex', jurisdiction: 'international',
  domain: 'causal-evidence', tier: 'independent_causal_research', accessMethod: 'works-api',
  url: 'https://api.openalex.org/works'
});
const PUBMED_SOURCE = Object.freeze({
  sourceId: 'pubmed-eutils', provider: 'U.S. National Library of Medicine / NCBI', jurisdiction: 'US',
  domain: 'causal-evidence', tier: 'independent_causal_research', accessMethod: 'eutils-api',
  url: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term='
});

function buildResearchQuery({ problem, outcome = null, intervention = null, geography = null } = {}) {
  const terms = [problem, outcome, intervention, geography].map(value => String(value || '').trim()).filter(Boolean);
  if (!terms.length) throw new Error('research-discovery-query-required');
  return terms.join(' ');
}

function buildOpenAlexUrl({ problem, outcome = null, intervention = null, geography = null, perPage = 25 } = {}) {
  if (!Number.isInteger(perPage) || perPage < 1 || perPage > 100) throw new Error('research-discovery-page-size-invalid');
  const query = buildResearchQuery({ problem, outcome, intervention, geography });
  const url = new URL(OPENALEX_SOURCE.url);
  url.searchParams.set('search', query);
  url.searchParams.set('per-page', String(perPage));
  return url.toString();
}

function extractResearchLeads(payload) {
  const rows = Array.isArray(payload?.results) ? payload.results : [];
  return rows.map(work => ({
    id: work.id || null,
    title: work.title || null,
    publicationYear: work.publication_year || null,
    doi: work.doi || null,
    citedByCount: Number.isFinite(work.cited_by_count) ? work.cited_by_count : null,
    type: work.type || null,
    openAccess: work.open_access?.is_oa === true,
    concepts: Array.isArray(work.concepts) ? work.concepts.slice(0, 10).map(concept => ({ id: concept.id || null, displayName: concept.display_name || null, score: concept.score ?? null })) : [],
    source: 'openalex',
    evidenceStatus: 'potential'
  })).filter(lead => lead.id && lead.title);
}

function buildPubMedSearchUrl({ problem, outcome = null, intervention = null, geography = null, retMax = 25 } = {}) {
  if (!Number.isInteger(retMax) || retMax < 1 || retMax > 100) throw new Error('pubmed-page-size-invalid');
  const query = buildResearchQuery({ problem, outcome, intervention, geography });
  const url = new URL(PUBMED_SOURCE.url);
  url.searchParams.set('term', query);
  url.searchParams.set('retmode', 'json');
  url.searchParams.set('retmax', String(retMax));
  url.searchParams.set('sort', 'relevance');
  return url.toString();
}

function buildPubMedSummaryUrl(ids = []) {
  if (!Array.isArray(ids) || !ids.length) return null;
  const url = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi');
  url.searchParams.set('db', 'pubmed');
  url.searchParams.set('id', ids.join(','));
  url.searchParams.set('retmode', 'json');
  return url.toString();
}

function extractPubMedLeads(payload) {
  const result = payload?.result || {};
  const ids = Array.isArray(result.uids) ? result.uids : Object.keys(result).filter(key => key !== 'uids');
  return ids.map(id => {
    const row = result[id];
    if (!row || typeof row !== 'object' || !row.title) return null;
    return {
      id: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      title: row.title,
      publicationYear: row.pubdate ? Number(String(row.pubdate).slice(0, 4)) || null : null,
      journal: row.fulljournalname || row.source || null,
      authors: Array.isArray(row.authors) ? row.authors.slice(0, 8).map(author => author.name).filter(Boolean) : [],
      source: 'pubmed',
      evidenceStatus: 'potential'
    };
  }).filter(Boolean);
}

async function discoverResearchLeads({ problem, outcome = null, intervention = null, geography = null, fetchImpl, now = new Date(), perPage = 25 } = {}) {
  const url = buildOpenAlexUrl({ problem, outcome, intervention, geography, perPage });
  const source = { ...OPENALEX_SOURCE, url };
  const snapshot = await retrieve(source, { fetchImpl, now });
  const payload = parsePayload(snapshot.bytes, snapshot.retrieval.contentType);
  if (payload.format !== 'json') throw new Error('research-discovery-response-not-json');
  const leads = extractResearchLeads(payload.value);
  return {
    schemaVersion: 'vidik.research-discovery.v1',
    query: buildResearchQuery({ problem, outcome, intervention, geography }),
    source: { ...snapshot.retrieval, provider: OPENALEX_SOURCE.provider },
    leads,
    discoveryHash: sha256({ query: buildResearchQuery({ problem, outcome, intervention, geography }), leads })
  };
}

async function discoverPubMedLeads({ problem, outcome = null, intervention = null, geography = null, fetchImpl, now = new Date(), perPage = 25 } = {}) {
  const searchUrl = buildPubMedSearchUrl({ problem, outcome, intervention, geography, retMax: perPage });
  const searchSnapshot = await retrieve({ ...PUBMED_SOURCE, url: searchUrl }, { fetchImpl, now });
  const searchPayload = parsePayload(searchSnapshot.bytes, searchSnapshot.retrieval.contentType);
  if (searchPayload.format !== 'json') throw new Error('pubmed-search-response-not-json');
  const ids = Array.isArray(searchPayload.value?.esearchresult?.idlist) ? searchPayload.value.esearchresult.idlist : [];
  if (!ids.length) return { schemaVersion: 'vidik.pubmed-discovery.v1', query: buildResearchQuery({ problem, outcome, intervention, geography }), source: searchSnapshot.retrieval, leads: [], discoveryHash: sha256({ ids: [] }) };
  const summaryUrl = buildPubMedSummaryUrl(ids);
  const summarySnapshot = await retrieve({ ...PUBMED_SOURCE, url: summaryUrl }, { fetchImpl, now });
  const summaryPayload = parsePayload(summarySnapshot.bytes, summarySnapshot.retrieval.contentType);
  if (summaryPayload.format !== 'json') throw new Error('pubmed-summary-response-not-json');
  const leads = extractPubMedLeads(summaryPayload.value);
  return {
    schemaVersion: 'vidik.pubmed-discovery.v1',
    query: buildResearchQuery({ problem, outcome, intervention, geography }),
    source: { search: searchSnapshot.retrieval, summary: summarySnapshot.retrieval, provider: PUBMED_SOURCE.provider },
    leads,
    discoveryHash: sha256({ query: buildResearchQuery({ problem, outcome, intervention, geography }), ids, leads })
  };
}

module.exports = {
  OPENALEX_SOURCE, PUBMED_SOURCE,
  buildResearchQuery, buildOpenAlexUrl, extractResearchLeads, discoverResearchLeads,
  buildPubMedSearchUrl, buildPubMedSummaryUrl, extractPubMedLeads, discoverPubMedLeads
};
