'use strict';

const { retrieve, parsePayload, sha256 } = require('./data-acquisition');
const { SOURCE_REGISTRY } = require('./source-registry');
const EVIDENCE_SOURCE_IDS = new Set(['openalex-works', 'pubmed-eutils']);
function queryFor(candidate, problem) { const name = String(candidate?.name || '').trim(); const text = String(candidate?.discoveryText || '').trim(); return `${problem} ${name} ${text}`.replace(/\s+/g, ' ').slice(0, 500); }
function buildEvidenceSearchUrl(source, query) { if (!source || !EVIDENCE_SOURCE_IDS.has(source.sourceId)) throw new Error('unsupported-evidence-source'); const url = new URL(source.url); if (source.sourceId === 'pubmed-eutils') { url.searchParams.set('term', query); url.searchParams.set('retmode', 'json'); } else url.searchParams.set('search', query); return url.toString(); }
function canonicalEvidenceSource(source) { return SOURCE_REGISTRY.find(candidate => candidate.sourceId === source?.sourceId) || null; }
function sourceIsAuthoritative(source) {
  const canonical = canonicalEvidenceSource(source);
  if (!canonical || !EVIDENCE_SOURCE_IDS.has(canonical.sourceId)) return false;
  // Causal research is independent of the user's jurisdiction. Jurisdiction belongs to the applicability
  // layer; it must not collapse the evidence universe to a single provider.
  return canonical.domain === 'causal-evidence' && (source?.jurisdiction === canonical.jurisdiction || canonical.jurisdiction === 'international' || canonical.sourceId === 'pubmed-eutils');
}
function evidenceConceptTokens(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\\s-]/g, ' ').split(/\\s+/)
    .filter(token => token.length > 3 && !new Set(['reduce','increase','improve','prevent','study','evaluate','intervention','interventions','program','programme','service','ways','effective']).has(token))
    .map(token => token.replace(/ies$/,'y').replace(/s$/,''));
}
function evidenceLeadRelevant(title, candidate, problem) {
  const haystack = String(title || '').toLowerCase();
  const candidateTokens = evidenceConceptTokens(candidate?.name);
  const problemTokens = evidenceConceptTokens(problem);
  const candidateHits = candidateTokens.filter(token => haystack.includes(token)).length;
  const problemHits = problemTokens.filter(token => haystack.includes(token)).length;
  return candidateHits > 0 || problemHits >= Math.min(2, Math.max(1, problemTokens.length));
}
function extractEvidenceLeads(payload, source, candidate, problem) {
  if (source.sourceId === 'openalex-works') {
    const rows = Array.isArray(payload?.results) ? payload.results : [];
    return rows.slice(0, 20).map(row => ({ id: `evidence:${source.sourceId}:${row.id || row.doi || row.display_name}`, candidateId: candidate.id, problem, sourceId: source.sourceId, sourceType: 'independent-causal-research', title: String(row.display_name || '').trim(), evidenceStatus: 'potential', evidenceLeadOnly: true, causalEffectImported: false, provenance: { sourceId: source.sourceId, jurisdiction: source.jurisdiction, externalId: row.id || row.doi || null } })).filter(row => row.title && evidenceLeadRelevant(row.title, candidate, problem));
  }
  const ids = Array.isArray(payload?.esearchresult?.idlist) ? payload.esearchresult.idlist : [];
  return ids.slice(0, 20).map(id => ({ id: `evidence:${source.sourceId}:${id}`, candidateId: candidate.id, problem, sourceId: source.sourceId, sourceType: 'independent-causal-research', title: `PubMed evidence record ${id}`, evidenceStatus: 'potential', evidenceLeadOnly: true, causalEffectImported: false, provenance: { sourceId: source.sourceId, jurisdiction: source.jurisdiction, externalId: id } }));
}
function sanitizeEvidenceLead(lead) { const safe = { ...lead }; for (const key of ['effect','causalEffect','estimatedImpact','effectSize','recommendationEligible','recommendation','productionEffect']) delete safe[key]; safe.evidenceLeadOnly = true; safe.causalEffectImported = false; return safe; }
function deduplicateEvidenceLeads(leads = []) { const seen = new Map(); for (const lead of leads) { const safe = sanitizeEvidenceLead(lead); const key = String(safe.id || '').toLowerCase(); if (!key) continue; const existing = seen.get(key); if (!existing) seen.set(key, { ...safe, sourceIds: [safe.sourceId] }); else existing.sourceIds = [...new Set([...existing.sourceIds, safe.sourceId])]; } return [...seen.values()]; }
function assessEvidenceSufficiency({ sourceSearches = [], evidenceLeads = [], requiredEvidence = ['causal','implementation','cost','equity'] } = {}) {
  const usable = sourceSearches.filter(search => search.status !== 'search-failed'); const failed = sourceSearches.filter(search => search.status === 'search-failed'); const uniqueLeads = deduplicateEvidenceLeads(evidenceLeads); const independentSourceCount = new Set(uniqueLeads.map(lead => lead.sourceId)).size;
  const complete = failed.length === 0 && usable.length >= 2 && independentSourceCount >= 2 && uniqueLeads.length > 0;
  return { sourceCount: sourceSearches.length, usableSourceCount: usable.length, failedSourceCount: failed.length, independentSourceCount, leadCount: uniqueLeads.length, requiredEvidence, evidenceComplete: complete, recommendationEligible: false, effectsImported: false, stoppingReason: sourceSearches.length === 0 ? 'no-evidence-searches' : failed.length === sourceSearches.length ? 'all-evidence-sources-failed' : uniqueLeads.length === 0 ? 'no-evidence-leads' : failed.length ? 'partial-evidence-source-failure' : independentSourceCount < 2 ? 'insufficient-independent-sources' : 'evidence-leads-acquired-not-validated' };
}
async function discoverCandidateEvidence({ problem, candidate, sources = null, fetchImpl, now = new Date(), rows = 10 } = {}) {
  if (!candidate?.id) throw new Error('candidate-required');
  const supplied = Array.isArray(sources) ? sources : null;
  const selected = (supplied ? supplied : SOURCE_REGISTRY.filter(source => EVIDENCE_SOURCE_IDS.has(source.sourceId)))
    .filter(sourceIsAuthoritative).map(source => canonicalEvidenceSource(source));
  const query = queryFor(candidate, problem);
  const diversifiedQueries = [...new Set([
    query,
    `${problem} ${candidate?.name || ''}`,
    `${candidate?.name || ''} causal`,
    `${candidate?.name || ''} systematic review`,
    `${problem} implementation`
  ].map(value => value.replace(/\\s+/g, ' ').trim()).filter(Boolean))].slice(0, 5);
  const searches = [], rawLeads = [];
  for (const source of selected) {
    for (const searchQuery of diversifiedQueries) {
      try {
        const url = buildEvidenceSearchUrl(source, searchQuery);
        const snapshot = await retrieve({ ...source, url }, { fetchImpl, now });
        const payload = parsePayload(snapshot.bytes, snapshot.retrieval.contentType);
        if (payload.format !== 'json') throw new Error('evidence-discovery-response-not-json');
        const found = extractEvidenceLeads(payload.value, source, candidate, problem);
        rawLeads.push(...found);
        searches.push({ sourceId: source.sourceId, status: found.length ? 'evidence-leads-found' : 'searched-empty', query: searchQuery, candidatesReturned: found.length, provenance: snapshot.retrieval, failureReason: null });
      } catch (error) {
        searches.push({ sourceId: source.sourceId, status: 'search-failed', query: searchQuery, candidatesReturned: 0, provenance: null, failureReason: error?.message || 'evidence-discovery-failed' });
      }
    }
  }
  const evidenceLeads = deduplicateEvidenceLeads(rawLeads);
  const sufficiency = assessEvidenceSufficiency({ sourceSearches: searches, evidenceLeads, requiredEvidence: candidate.requiredEvidence || ['causal','implementation','cost','equity'] });
  return { schemaVersion: 'vidik.source-driven-evidence-discovery.v3', problem, candidateId: candidate.id, query, diversifiedQueries, sourceSearches: searches, evidenceLeads, evidenceSufficiency: sufficiency, evidenceComplete: false, recommendationEligible: false, effectsImported: false, discoveryHash: sha256({ problem, candidateId: candidate.id, searches, evidenceLeads }) };
}
module.exports = { EVIDENCE_SOURCE_IDS, queryFor, buildEvidenceSearchUrl, canonicalEvidenceSource, sourceIsAuthoritative, extractEvidenceLeads, sanitizeEvidenceLead, deduplicateEvidenceLeads, assessEvidenceSufficiency, discoverCandidateEvidence };
