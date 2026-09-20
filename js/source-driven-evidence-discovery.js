'use strict';

const { retrieve, parsePayload, sha256 } = require('./data-acquisition');
const { SOURCE_REGISTRY } = require('./source-registry');
const EVIDENCE_SOURCE_IDS = new Set(['openalex-works', 'pubmed-eutils']);
function queryFor(candidate, problem) { const name = String(candidate?.name || '').trim(); const families = Array.isArray(candidate?.interventionFamily) ? candidate.interventionFamily : []; const familyTerms = [...new Set(families.flatMap(family => ({'public-safety':['violence interruption','focused deterrence','hot spot policing','community violence intervention','street outreach','firearm violence prevention'],'housing':['housing first','rapid rehousing','supportive housing','rental assistance','eviction prevention'],'health-service':['community paramedicine','mobile crisis response','care navigation','community health worker','mobile clinic','overdose prevention'],'food-access':['food voucher','community food hub','mobile market','community kitchen','school meal program'],'climate-resilience':['cooling centre','clean air shelter','home cooling','smoke filtration','flood mitigation'],'mobility-safety':['bus priority','protected bike lane','pedestrian crossing','traffic calming','signal timing','road diet'],'employment':['job placement','career pathway','skills training','apprenticeship','reskilling','wage subsidy'],'economic-support':['small business grant','working capital support','business advisory service','utility assistance','cash transfer'],'infrastructure':['preventive maintenance','asset management','capacity expansion','retrofit'],'digital-access':['broadband subsidy','broadband voucher','internet access support','device lending','digital literacy'],'regulatory':['permit modernization','digital permitting','inspection reform','licensing reform'],'accessibility':['accessible design','assistive technology','accommodation program','inclusive service design'],'cybersecurity':['zero trust','multi factor authentication','endpoint detection','security awareness training','backup and recovery']})[family] || [])).slice(0,4)]; return `${problem} ${name} ${familyTerms.join(' ')}`.replace(/\s+/g, ' ').slice(0, 500); }
function buildPubmedSummaryUrl(source, ids) { if (!source || source.sourceId !== 'pubmed-eutils' || !ids.length) throw new Error('pubmed-summary-input-required'); const url = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi'); url.searchParams.set('db','pubmed'); url.searchParams.set('id',ids.join(',')); url.searchParams.set('retmode','json'); return url.toString(); }
function buildEvidenceSearchUrl(source, query) { if (!source || !EVIDENCE_SOURCE_IDS.has(source.sourceId)) throw new Error('unsupported-evidence-source'); const url = new URL(source.url); if (source.sourceId === 'pubmed-eutils') { url.searchParams.set('term', query); url.searchParams.set('retmode', 'json'); } else url.searchParams.set('search', query); return url.toString(); }
function canonicalEvidenceSource(source) { return SOURCE_REGISTRY.find(candidate => candidate.sourceId === source?.sourceId) || null; }
function sourceIsAuthoritative(source) {
  const canonical = canonicalEvidenceSource(source);
  if (!canonical || !EVIDENCE_SOURCE_IDS.has(canonical.sourceId)) return false;
  // Causal research is independent of the user's jurisdiction. Jurisdiction belongs to the applicability
  // layer; it must not collapse the evidence universe to a single provider.
  return canonical.domain === 'causal-evidence' && (source?.jurisdiction === canonical.jurisdiction || canonical.sourceId === 'pubmed-eutils');
}
function evidenceConceptTokens(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)
    .filter(token => token.length > 3 && !new Set(['reduce','increase','improve','prevent','study','evaluate','intervention','interventions','program','programme','service','ways','effective']).has(token))
    .map(token => token.replace(/ies$/,'y').replace(/s$/,''));
}
function evidenceLeadRelevant(title, candidate, problem) {
  const haystack = String(title || '').toLowerCase();
  const candidateTokens = evidenceConceptTokens(candidate?.name);
  const problemTokens = evidenceConceptTokens(problem);
  const candidateHits = candidateTokens.filter(token => haystack.includes(token)).length;
  const problemHits = problemTokens.filter(token => haystack.includes(token)).length;
  const familyTerms = queryFor(candidate, '').split(/\s+/).filter(Boolean).slice(0).filter(token => token.length > 4);
  const familyHits = familyTerms.filter(term => haystack.includes(term)).length;
  return candidateHits > 0 || problemHits >= Math.min(2, Math.max(1, problemTokens.length)) || familyHits >= 2;
}
function extractEvidenceLeads(payload, source, candidate, problem) {
  if (source.sourceId === 'openalex-works') {
    const rows = Array.isArray(payload?.results) ? payload.results : [];
    return rows.slice(0, 20).map(row => ({ id: `evidence:${source.sourceId}:${row.id || row.doi || row.display_name}`, candidateId: candidate.id, problem, sourceId: source.sourceId, sourceType: 'independent-causal-research', title: String(row.display_name || '').trim(), evidenceStatus: 'potential', evidenceLeadOnly: true, causalEffectImported: false, provenance: { sourceId: source.sourceId, jurisdiction: source.jurisdiction, externalId: row.id || row.doi || null } })).filter(row => row.title && evidenceLeadRelevant(row.title, candidate, problem));
  }
  const ids = Array.isArray(payload?.esearchresult?.idlist) ? payload.esearchresult.idlist : [];
  const summaries = payload?._vidikSummaries || {};
  return ids.slice(0, 20).map(id => {
    const summary = summaries[id] || {};
    const title = String(summary.title || '').trim();
    if (!title || !evidenceLeadRelevant(title,candidate,problem)) return null;
    return { id: `evidence:${source.sourceId}:${id}`, candidateId: candidate.id, problem, sourceId: source.sourceId, sourceType: 'independent-causal-research', title, evidenceStatus: 'potential', evidenceLeadOnly: true, causalEffectImported: false, relevanceStatus: 'verified', provenance: { sourceId: source.sourceId, jurisdiction: source.jurisdiction, externalId: id } };
  }).filter(Boolean);
}
function sanitizeEvidenceLead(lead) { const safe = { ...lead }; for (const key of ['effect','causalEffect','estimatedImpact','effectSize','recommendationEligible','recommendation','productionEffect']) delete safe[key]; safe.evidenceLeadOnly = true; safe.causalEffectImported = false; return safe; }
function deduplicateEvidenceLeads(leads = []) { const seen = new Map(); for (const lead of leads) { const safe = sanitizeEvidenceLead(lead); const key = String(safe.id || '').toLowerCase(); if (!key) continue; const existing = seen.get(key); if (!existing) seen.set(key, { ...safe, sourceIds: [safe.sourceId] }); else existing.sourceIds = [...new Set([...existing.sourceIds, safe.sourceId])]; } return [...seen.values()]; }
function assessEvidenceSufficiency({ sourceSearches = [], evidenceLeads = [], requiredEvidence = ['causal','implementation','cost','equity'] } = {}) {
  const usable = sourceSearches.filter(search => search.status !== 'search-failed'); const failed = sourceSearches.filter(search => search.status === 'search-failed'); const uniqueLeads = deduplicateEvidenceLeads(evidenceLeads); const independentSourceCount = new Set(uniqueLeads.map(lead => lead.sourceId)).size;
  const relevantLeads = uniqueLeads.filter(lead => lead.relevanceStatus === 'verified' || lead.sourceId === 'openalex-works'); const complete = failed.length === 0 && usable.length >= 2 && independentSourceCount >= 2 && relevantLeads.length > 0;
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
    `${candidate?.name || ''} ${Array.isArray(candidate?.interventionFamily) ? candidate.interventionFamily.join(' ') : ''} evidence`,
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
        let evidencePayload = payload.value;
        if (source.sourceId === 'pubmed-eutils') {
          const ids = Array.isArray(evidencePayload?.esearchresult?.idlist) ? evidencePayload.esearchresult.idlist.slice(0,20) : [];
          if (ids.length) {
            const summarySnapshot = await retrieve({ ...source, url: buildPubmedSummaryUrl(source, ids) }, { fetchImpl, now });
            const summaryPayload = parsePayload(summarySnapshot.bytes, summarySnapshot.retrieval.contentType);
            if (summaryPayload.format !== 'json') throw new Error('pubmed-summary-response-not-json');
            evidencePayload = { ...evidencePayload, _vidikSummaries: summaryPayload.value?.result || {} };
          }
        }
        const found = extractEvidenceLeads(evidencePayload, source, candidate, problem);
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
module.exports = { EVIDENCE_SOURCE_IDS, queryFor, buildPubmedSummaryUrl, buildEvidenceSearchUrl, canonicalEvidenceSource, sourceIsAuthoritative, extractEvidenceLeads, sanitizeEvidenceLead, deduplicateEvidenceLeads, assessEvidenceSufficiency, discoverCandidateEvidence };
