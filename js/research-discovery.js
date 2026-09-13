'use strict';

const { retrieve, parsePayload, sha256 } = require('./data-acquisition');

const OPENALEX_SOURCE = Object.freeze({
  sourceId: 'openalex-works', provider: 'OpenAlex', jurisdiction: 'international',
  domain: 'causal-evidence', tier: 'independent_causal_research',
  url: 'https://api.openalex.org/works'
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

module.exports = { OPENALEX_SOURCE, buildResearchQuery, buildOpenAlexUrl, extractResearchLeads, discoverResearchLeads };
