'use strict';

const { retrieve, parsePayload, sha256 } = require('./data-acquisition');
const { SOURCE_REGISTRY } = require('./source-registry');

const EVIDENCE_SOURCE_IDS = new Set(['openalex-works', 'pubmed-eutils']);

function queryFor(candidate, problem) {
  const name = String(candidate?.name || '').trim();
  const text = String(candidate?.discoveryText || '').trim();
  return `${problem} ${name} ${text}`.replace(/\s+/g, ' ').slice(0, 500);
}

function buildEvidenceSearchUrl(source, query) {
  if (!source || !EVIDENCE_SOURCE_IDS.has(source.sourceId)) throw new Error('unsupported-evidence-source');
  const url = new URL(source.url);
  if (source.sourceId === 'pubmed-eutils') {
    url.searchParams.set('term', query);
    url.searchParams.set('retmode', 'json');
  } else url.searchParams.set('search', query);
  return url.toString();
}

function extractEvidenceLeads(payload, source, candidate, problem) {
  if (source.sourceId === 'openalex-works') {
    const rows = Array.isArray(payload?.results) ? payload.results : [];
    return rows.slice(0, 10).map(row => ({
      id: `evidence:${source.sourceId}:${row.id || row.doi || row.display_name}`,
      candidateId: candidate.id, problem, sourceId: source.sourceId, sourceType: 'independent-causal-research',
      title: String(row.display_name || '').trim(),
      evidenceStatus: 'potential', evidenceLeadOnly: true, causalEffectImported: false,
      provenance: { sourceId: source.sourceId, jurisdiction: source.jurisdiction, externalId: row.id || row.doi || null }
    })).filter(row => row.title);
  }
  const ids = Array.isArray(payload?.esearchresult?.idlist) ? payload.esearchresult.idlist : [];
  return ids.slice(0, 10).map(id => ({
    id: `evidence:${source.sourceId}:${id}`, candidateId: candidate.id, problem, sourceId: source.sourceId,
    sourceType: 'independent-causal-research', title: `PubMed evidence record ${id}`, evidenceStatus: 'potential', evidenceLeadOnly: true,
    causalEffectImported: false, provenance: { sourceId: source.sourceId, jurisdiction: source.jurisdiction, externalId: id }
  }));
}

async function discoverCandidateEvidence({ problem, candidate, sources = null, fetchImpl, now = new Date(), rows = 10 } = {}) {
  if (!candidate?.id) throw new Error('candidate-required');
  const selected = Array.isArray(sources) ? sources : SOURCE_REGISTRY.filter(source => EVIDENCE_SOURCE_IDS.has(source.sourceId));
  const query = queryFor(candidate, problem);
  const searches = [], leads = [];
  for (const source of selected) {
    try {
      const url = buildEvidenceSearchUrl(source, query);
      const snapshot = await retrieve({ ...source, url }, { fetchImpl, now });
      const payload = parsePayload(snapshot.bytes, snapshot.retrieval.contentType);
      if (payload.format !== 'json') throw new Error('evidence-discovery-response-not-json');
      const found = extractEvidenceLeads(payload.value, source, candidate, problem);
      leads.push(...found);
      searches.push({ sourceId: source.sourceId, status: found.length ? 'evidence-leads-found' : 'searched-empty', query, candidatesReturned: found.length, provenance: snapshot.retrieval, failureReason: null });
    } catch (error) {
      searches.push({ sourceId: source.sourceId, status: 'search-failed', query, candidatesReturned: 0, provenance: null, failureReason: error?.message || 'evidence-discovery-failed' });
    }
  }
  return {
    schemaVersion: 'vidik.source-driven-evidence-discovery.v1', problem, candidateId: candidate.id, query,
    sourceSearches: searches, evidenceLeads: leads, evidenceComplete: false, recommendationEligible: false,
    effectsImported: false, discoveryHash: sha256({ problem, candidateId: candidate.id, searches, leads })
  };
}

module.exports = { EVIDENCE_SOURCE_IDS, queryFor, buildEvidenceSearchUrl, extractEvidenceLeads, discoverCandidateEvidence };
