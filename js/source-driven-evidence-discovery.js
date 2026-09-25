'use strict';

const { retrieve, parsePayload, sha256 } = require('./data-acquisition');
const { SOURCE_REGISTRY } = require('./source-registry');
const EVIDENCE_SOURCE_IDS = new Set(['openalex-works', 'pubmed-eutils', 'crossref-works']);
const EVIDENCE_SOURCE_FAMILIES = Object.freeze({
  'openalex-works': 'open-literature-index',
  'pubmed-eutils': 'biomedical-index',
  'crossref-works': 'bibliographic-metadata-index'
});
const EVIDENCE_CAUSAL_SOURCE_IDS = new Set(['openalex-works', 'pubmed-eutils']);
const EVIDENCE_SEARCH_MAX_QUERIES_PER_SOURCE = 10;

const EVIDENCE_SEARCH_STOP_AFTER_CANDIDATE_LEADS = 2;
const EVIDENCE_FAMILY_TERMS = Object.freeze({
  'public-safety':['violence interruption','focused deterrence','hot spot policing','community violence intervention','violence prevention','street outreach','firearm violence prevention'],
  housing:['housing first','rapid rehousing','supportive housing','rental assistance','eviction prevention','housing outcomes'],
  'health-service':['community paramedicine','mobile crisis response','care navigation','community health worker','mobile clinic','overdose prevention'],
  'food-access':['food voucher','community food hub','mobile market','community kitchen','school meal program'],
  'climate-resilience':['cooling centre','clean air shelter','home cooling','smoke filtration','flood mitigation'],
  'mobility-safety':['bus priority','protected bike lane','pedestrian crossing','traffic calming','signal timing','road diet'],
  employment:['job placement','career pathway','skills training','apprenticeship','reskilling','wage subsidy'],
  'economic-support':['small business grant','working capital support','business advisory service','utility assistance','cash transfer'],
  infrastructure:['preventive maintenance','asset management','capacity expansion','retrofit'],
  'digital-access':['broadband subsidy','broadband voucher','internet access support','device lending','digital literacy'],
  regulatory:['permit modernization','digital permitting','inspection reform','licensing reform'],
  accessibility:['accessible design','assistive technology','accommodation program','inclusive service design'],
  cybersecurity:['zero trust','multi factor authentication','endpoint detection','security awareness training','backup and recovery','incident response'],
  'public-service':['library service redesign','extended library hours','mobile library','queue management','appointment scheduling','service capacity expansion','digital service access'],
  environmental:['noise mitigation','noise barrier','quiet pavement','water treatment','source water protection','air pollution control','waste reduction'],
  energy:['home energy assistance','energy bill assistance','utility bill assistance','weatherization assistance','energy efficiency retrofit'],
  education:['school meal program','after-school program','student support','early childhood education','tutoring'],
  infrastructure:['preventive maintenance','asset management','capacity expansion','retrofit','emergency response coordination','incident command','business continuity response']
});
function queryFor(candidate, problem) {
  const name = String(candidate?.name || '').trim();
  const families = Array.isArray(candidate?.interventionFamily) ? candidate.interventionFamily : [];
  const familyTerms = [...new Set(families.flatMap(family => EVIDENCE_FAMILY_TERMS[family] || []))].slice(0, 4);
  return `${problem} ${name} ${familyTerms.join(' ')}`.replace(/\s+/g, ' ').slice(0, 500);
}
function buildPubmedSummaryUrl(source, ids) { if (!source || source.sourceId !== 'pubmed-eutils' || !ids.length) throw new Error('pubmed-summary-input-required'); const url = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi'); url.searchParams.set('db','pubmed'); url.searchParams.set('id',ids.join(',')); url.searchParams.set('retmode','json'); return url.toString(); }
function buildPubmedAbstractUrl(source, ids) { if (!source || source.sourceId !== 'pubmed-eutils' || !ids.length) throw new Error('pubmed-abstract-input-required'); const url = new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi'); url.searchParams.set('db','pubmed'); url.searchParams.set('id',ids.join(',')); url.searchParams.set('retmode','xml'); return url.toString(); }
function decodeXml(value) { return String(value || '').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'\"').replace(/&#39;/g,"'").replace(/&#x27;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/\s+/g,' ').trim(); }
function extractPubmedAbstracts(xml) {
  const text = String(xml || ''); const out = {};
  for (const article of text.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g)) {
    const block = article[1]; const id = block.match(/<PMID[^>]*>([^<]+)<\/PMID>/)?.[1]?.trim();
    if (!id) continue;
    const parts = [...block.matchAll(/<AbstractText(?: [^>]*)?>([\s\S]*?)<\/AbstractText>/g)].map(m=>decodeXml(m[1])).filter(Boolean);
    if (parts.length) out[id] = parts.join(' ');
  }
  return out;
}
function buildEvidenceSearchUrl(source, query) { if (!source || !EVIDENCE_SOURCE_IDS.has(source.sourceId)) throw new Error('unsupported-evidence-source'); const url = new URL(source.url); if (source.sourceId === 'pubmed-eutils') { url.searchParams.set('term', query); url.searchParams.set('retmode', 'json'); } else if (source.sourceId === 'crossref-works') { url.searchParams.set('query.bibliographic', query); url.searchParams.set('rows', '20'); url.searchParams.set('select', 'DOI,title,abstract,type,published,URL'); } else url.searchParams.set('search', query); return url.toString(); }
function canonicalEvidenceSource(source) { return SOURCE_REGISTRY.find(candidate => candidate.sourceId === source?.sourceId) || null; }
function sourceIsAuthoritative(source) {
  const canonical = canonicalEvidenceSource(source);
  if (!canonical || !EVIDENCE_SOURCE_IDS.has(canonical.sourceId)) return false;
  // Causal research is independent of the user's jurisdiction. Jurisdiction belongs to the applicability
  // layer; it must not collapse the evidence universe to a single provider. International indexes
  // (OpenAlex/Crossref) and PubMed are valid evidence providers for any decision jurisdiction.
  return canonical.domain === 'causal-evidence' &&
    (canonical.jurisdiction === 'international' || canonical.sourceId === 'pubmed-eutils');
}
function evidenceConceptTokens(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/)
    .filter(token => token.length > 3 && !new Set(['reduce','increase','improve','prevent','study','evaluate','intervention','interventions','program','programme','service','ways','effective']).has(token))
    .map(token => token.replace(/ies$/,'y').replace(/s$/,''));
}
function normalizeEvidenceText(value) {
  return String(value || '').toLowerCase()
    .replace(/\bcentres\b/g, 'centers')
    .replace(/\bprogrammes\b/g, 'programs')
    .replace(/\bprograms\b/g, 'program')
    .replace(/[-_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function evidenceLeadRelevance(title, candidate, problem) {
  const haystack = normalizeEvidenceText(title);
  const candidateName = normalizeEvidenceText(candidate?.name);
  const families = Array.isArray(candidate?.interventionFamily) ? candidate.interventionFamily : [];
  const candidateTokens = evidenceConceptTokens(candidate?.name).map(token => token.replace(/^centre$/, 'center'));
  const discoveryText = normalizeEvidenceText(candidate?.discoveryText);
  const discoveryTokens = evidenceConceptTokens(candidate?.discoveryText).map(token => token.replace(/^centre$/, 'center'));
  const discoveryPhrases = [candidate?.name, candidate?.discoveryText].filter(Boolean)
    .map(value => normalizeEvidenceText(value))
    .filter(phrase => phrase.length >= 8);
  const exactNameHit = candidateName.length >= 8 && haystack.includes(candidateName);
  // Many intervention candidates have administrative suffixes (Program, Initiative,
  // Service) that do not appear in research titles. Match the remaining distinctive
  // proper-name phrase as an identity anchor, while family-only mechanism terms remain
  // insufficient for candidates whose names do not contain that phrase.
  const candidateIdentityPhrase = candidateName
    .replace(/\b(program|programme|initiative|service|model|approach|strategy|project)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const identityPhraseHit = candidateIdentityPhrase.length >= 12 && haystack.includes(candidateIdentityPhrase);
  const discoveryIdentityPhrases = [candidate?.name, candidate?.discoveryText]
    .filter(Boolean)
    .flatMap(value => normalizeEvidenceText(value).split(/\b(?:and|or|with|including)\b|[,;:]/))
    .map(phrase => phrase.trim())
    .filter(phrase => phrase.length >= 12);
  const operationalPhraseHit = discoveryPhrases.some(phrase => haystack.includes(phrase)) ||
    discoveryIdentityPhrases.some(phrase => haystack.includes(phrase));
  const candidateHits = candidateTokens.filter(token => haystack.includes(token)).length;
  const familyTokens = new Set(families.flatMap(family =>
    (EVIDENCE_FAMILY_TERMS[family] || []).flatMap(term => evidenceConceptTokens(term))
  ));
  // Generic words that define the intervention family are not candidate-specific
  // identifiers. Require overlap with a candidate's distinguishing name tokens
  // before promoting family-level literature to candidate-match.
  const distinguishingTokens = candidateTokens.filter(token =>
    token.length >= 5 &&
    !['additional','support','service','capacity','program'].includes(token) &&
    !familyTokens.has(token)
  );
  const distinguishingHits = distinguishingTokens.filter(token => haystack.includes(token)).length;
  const candidateFamilyHit = families.some(family => (EVIDENCE_FAMILY_TERMS[family] || []).some(term => {
    const normalizedTerm = normalizeEvidenceText(term);
    return normalizedTerm.length >= 8 && haystack.includes(normalizedTerm);
  }));
  const discoveryHits = discoveryTokens.filter(token => haystack.includes(token)).length;
  const discoveryAnchorHit = discoveryText.length >= 8 && discoveryHits >= 2 &&
    discoveryTokens.some(token => token.length >= 6 && !familyTokens.has(token) && haystack.includes(token));
  if (exactNameHit || identityPhraseHit || operationalPhraseHit || distinguishingHits >= 2 || discoveryAnchorHit) return 'candidate-match';
  const problemText = normalizeEvidenceText(problem);
  const problemTokens = evidenceConceptTokens(problem);
  const problemHits = problemTokens.filter(token => haystack.includes(token)).length;
  const problemPhraseHit = problemText.length >= 8 && haystack.includes(problemText);
  const familyPhraseHit = families.some(family => (EVIDENCE_FAMILY_TERMS[family] || []).some(term => {
    const normalizedTerm = normalizeEvidenceText(term);
    if (haystack.includes(normalizedTerm)) return true;
    const termTokens = evidenceConceptTokens(normalizedTerm);
    return termTokens.length >= 2 && termTokens.every(token => haystack.includes(token));
  }));
  if (familyPhraseHit) return 'family-match';
  if (problemPhraseHit || problemHits >= Math.min(2, Math.max(1, problemTokens.length))) return 'problem-match';
  return null;
}
function evidenceLeadRelevant(title, candidate, problem) { return Boolean(evidenceLeadRelevance(title, candidate, problem)); }
function openAlexAbstractText(row) {
  const inverted = row?.abstract_inverted_index;
  if (!inverted || typeof inverted !== 'object') return '';
  const terms = [];
  for (const [word, positions] of Object.entries(inverted)) {
    for (const position of Array.isArray(positions) ? positions : []) {
      if (Number.isInteger(position)) terms.push([position, word]);
    }
  }
  return terms.sort((a, b) => a[0] - b[0]).map(([, word]) => word).join(' ').trim();
}
function extractEvidenceLeads(payload, source, candidate, problem) {
  if (source.sourceId === 'crossref-works') {
    const rows = Array.isArray(payload?.message?.items) ? payload.message.items : [];
    return rows.slice(0, 20).map(row => {
      const title = Array.isArray(row.title) ? String(row.title[0] || '').trim() : String(row.title || '').trim();
      const abstract = String(row.abstract || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const searchable = `${title} ${abstract}`.trim();
      const relevanceStatus = evidenceLeadRelevance(searchable, candidate, problem);
      return {
        id: `evidence:${source.sourceId}:${row.DOI || row.URL || title}`,
        candidateId: candidate.id, problem, sourceId: source.sourceId,
        sourceFamily: EVIDENCE_SOURCE_FAMILIES[source.sourceId],
        sourceRole: 'supporting-literature-index',
        sourceType: 'independent-literature-index',
        title, evidenceStatus: 'potential', evidenceLeadOnly: true, causalEffectImported: false,
        relevanceStatus,
        provenance: { sourceId: source.sourceId, jurisdiction: source.jurisdiction, externalId: row.DOI || row.URL || null, contentBasis: abstract ? 'title-and-abstract' : 'title-only' }
      };
    }).filter(row => row.title && Boolean(row.relevanceStatus));
  }
  if (source.sourceId === 'openalex-works') {
    const rows = Array.isArray(payload?.results) ? payload.results : [];
    return rows.slice(0, 20).map(row => { const title = String(row.display_name || row.title || '').trim(); const abstract = openAlexAbstractText(row); const searchable = `${title} ${abstract}`.trim(); const relevanceStatus = evidenceLeadRelevance(searchable, candidate, problem); return { id: `evidence:${source.sourceId}:${row.id || row.doi || row.display_name || row.title}`, candidateId: candidate.id, problem, sourceId: source.sourceId, sourceFamily: EVIDENCE_SOURCE_FAMILIES[source.sourceId], sourceRole: 'causal-research-index', sourceFamily: EVIDENCE_SOURCE_FAMILIES[source.sourceId], sourceRole: 'causal-research-index', sourceType: 'independent-causal-research', title, evidenceStatus: 'potential', evidenceLeadOnly: true, causalEffectImported: false, relevanceStatus, provenance: { sourceId: source.sourceId, jurisdiction: source.jurisdiction, externalId: row.id || row.doi || null, contentBasis: abstract ? 'title-and-abstract' : 'title-only' } }; }).filter(row => row.title && Boolean(row.relevanceStatus));
  }
  const ids = Array.isArray(payload?.esearchresult?.idlist) ? payload.esearchresult.idlist : [];
  const summaries = payload?._vidikSummaries || {}; const abstracts = payload?._vidikAbstracts || {};
  return ids.slice(0, 20).map(id => {
    const summary = summaries[id] || {}; const title = String(summary.title || '').trim(); const abstract = String(abstracts[id] || '').trim(); const searchable = `${title} ${abstract}`.trim();
    if (!title || !evidenceLeadRelevant(searchable,candidate,problem)) return null;
    return { id: `evidence:${source.sourceId}:${id}`, candidateId: candidate.id, problem, sourceId: source.sourceId, sourceFamily: EVIDENCE_SOURCE_FAMILIES[source.sourceId], sourceRole: 'causal-research-index', sourceType: 'independent-causal-research', title, evidenceStatus: 'potential', evidenceLeadOnly: true, causalEffectImported: false, relevanceStatus: evidenceLeadRelevance(searchable, candidate, problem), provenance: { sourceId: source.sourceId, jurisdiction: source.jurisdiction, externalId: id, contentBasis: abstract ? 'title-and-abstract' : 'title-only' } };
  }).filter(Boolean);
}
function sanitizeEvidenceLead(lead) { const safe = { ...lead }; for (const key of ['effect','causalEffect','estimatedImpact','effectSize','recommendationEligible','recommendation','productionEffect']) delete safe[key]; safe.evidenceLeadOnly = true; safe.causalEffectImported = false; return safe; }
function deduplicateEvidenceLeads(leads = []) { const seen = new Map(); for (const lead of leads) { const safe = sanitizeEvidenceLead(lead); const key = String(safe.id || '').toLowerCase(); if (!key) continue; const existing = seen.get(key); if (!existing) seen.set(key, { ...safe, sourceIds: [safe.sourceId] }); else existing.sourceIds = [...new Set([...existing.sourceIds, safe.sourceId])]; } return [...seen.values()]; }
function assessEvidenceSufficiency({ sourceSearches = [], evidenceLeads = [], requiredEvidence = ['causal','implementation','cost','equity'] } = {}) {
  const usable = sourceSearches.filter(search => search.status !== 'search-failed'); const failed = sourceSearches.filter(search => search.status === 'search-failed'); const uniqueLeads = deduplicateEvidenceLeads(evidenceLeads);
  const relevantLeads = uniqueLeads.filter(lead => lead.relevanceStatus === 'candidate-match' || lead.relevanceStatus === 'verified');
  const independentSourceCount = new Set(relevantLeads.map(lead => lead.sourceId)).size;
  const independentSourceFamilyCount = new Set(relevantLeads.map(lead => lead.sourceFamily || EVIDENCE_SOURCE_FAMILIES[lead.sourceId] || lead.sourceId)).size;
  const causalSourceCount = new Set(relevantLeads.filter(lead => EVIDENCE_CAUSAL_SOURCE_IDS.has(lead.sourceId)).map(lead => lead.sourceId)).size;
  // Crossref can improve provider diversity and recall, but it is a bibliographic
  // metadata index, not causal identification. Completion therefore requires at
  // least one causal provider plus two independent provider families.
  const complete = failed.length === 0 && usable.length >= 2 && independentSourceCount >= 2 && independentSourceFamilyCount >= 2 && causalSourceCount >= 1 && relevantLeads.length > 0;
  return { sourceCount: sourceSearches.length, usableSourceCount: usable.length, failedSourceCount: failed.length, independentSourceCount, independentSourceFamilyCount, causalSourceCount, leadCount: uniqueLeads.length, requiredEvidence, evidenceComplete: complete, recommendationEligible: false, effectsImported: false, stoppingReason: sourceSearches.length === 0 ? 'no-evidence-searches' : failed.length === sourceSearches.length ? 'all-evidence-sources-failed' : uniqueLeads.length === 0 ? 'no-evidence-leads' : failed.length ? 'partial-evidence-source-failure' : independentSourceCount < 2 ? 'insufficient-independent-sources' : 'evidence-leads-acquired-not-validated' };
}
async function discoverCandidateEvidence({ problem, candidate, sources = null, fetchImpl, now = new Date(), rows = 10 } = {}) {
  if (!candidate?.id) throw new Error('candidate-required');
  const supplied = Array.isArray(sources) ? sources : null;
  const selected = (supplied ? supplied : SOURCE_REGISTRY.filter(source => EVIDENCE_SOURCE_IDS.has(source.sourceId)))
    .filter(sourceIsAuthoritative).map(source => canonicalEvidenceSource(source));
  const query = queryFor(candidate, problem);
  const discoveryTerms = evidenceConceptTokens(candidate?.discoveryText).slice(0, 8);
  const name = String(candidate?.name || '').trim();
  // Evidence retrieval is deliberately bounded. The previous fan-out issued up to
  // 8 queries per source per candidate, creating hundreds of external requests in the
  // 60-case battery and making availability/rate-limit failures look like semantic misses.
  const familyTerms = [...new Set(
    (Array.isArray(candidate?.interventionFamily) ? candidate.interventionFamily : [])
      .flatMap(family => EVIDENCE_FAMILY_TERMS[family] || [])
  )].slice(0, 3);
  // Literature indexes often fail on fully conjunctive queries even when the
  // candidate has relevant evidence. Keep independent candidate anchors in the
  // query set; relevance is still decided by evidenceLeadRelevance below.
  const discoveryPhrase = discoveryTerms.slice(0, 6).join(' ');
  const mechanismTerms = {
    'public-safety': ['violence prevention','violence interruption','focused deterrence','hot spots','community violence'],
    housing: ['supportive housing','rapid rehousing','housing first','homeless services'],
    'health-service': ['care navigation','community paramedicine','mobile clinic','integrated care'],
    employment: ['wage subsidy','supported employment','job training'],
    education: ['tutoring','mentoring','early childhood','school attendance'],
    'mobility-safety': ['traffic calming','speed management','protected bike lanes','pedestrian safety'],
    'climate-resilience': ['cooling centers','heat action','clean air shelters','home cooling'],
    'economic-support': ['cash transfer','income support','food voucher','subsidy']
  };
  const mechanismPhrase = [...new Set((candidate.interventionFamily || []).flatMap(f => mechanismTerms[f] || []))].slice(0, 4).join(' ');
  const diversifiedQueries = [...new Set([
    name,
    name + ' ' + problem,
    name + ' ' + familyTerms.join(' '),
    name + ' ' + mechanismPhrase,
    name + ' systematic review',
    name + ' meta analysis',
    name + ' implementation evaluation',
    name + ' impact evaluation',
    name + ' randomized trial',
    discoveryPhrase,
    problem + ' ' + familyTerms.join(' '),
    problem + ' ' + mechanismPhrase,
    problem + ' systematic review meta analysis',
    problem + ' implementation evaluation',
    query
  ].map(value => value.replace(/\s+/g, ' ').trim()).filter(value => value.length > 3))].slice(0, EVIDENCE_SEARCH_MAX_QUERIES_PER_SOURCE);
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
            const abstractSnapshot = await retrieve({ ...source, url: buildPubmedAbstractUrl(source, ids) }, { fetchImpl, now });
            const abstractText = Buffer.from(abstractSnapshot.bytes).toString('utf8');
            evidencePayload = { ...evidencePayload, _vidikSummaries: summaryPayload.value?.result || {}, _vidikAbstracts: extractPubmedAbstracts(abstractText) };
          }
        }
        const found = extractEvidenceLeads(evidencePayload, source, candidate, problem);
        rawLeads.push(...found);
        searches.push({ sourceId: source.sourceId, status: found.length ? 'evidence-leads-found' : 'searched-empty', query: searchQuery, candidatesReturned: found.length, provenance: snapshot.retrieval, failureReason: null });
        // Stop once this source has produced relevant leads. Independence still requires
        // a second source; extra queries after success only add external load.
        const candidateMatched = found.filter(lead => lead.relevanceStatus === 'candidate-match' || lead.relevanceStatus === 'verified').length;
        if (candidateMatched >= EVIDENCE_SEARCH_STOP_AFTER_CANDIDATE_LEADS) break;
      } catch (error) {
        searches.push({ sourceId: source.sourceId, status: 'search-failed', query: searchQuery, candidatesReturned: 0, provenance: null, failureReason: error?.message || 'evidence-discovery-failed' });
      }
    }
  }
  const evidenceLeads = deduplicateEvidenceLeads(rawLeads);
  const sufficiency = assessEvidenceSufficiency({ sourceSearches: searches, evidenceLeads, requiredEvidence: candidate.requiredEvidence || ['causal','implementation','cost','equity'] });
  const sourceDiagnostics = Object.fromEntries(selected.map(source => [source.sourceId, { sourceFamily:EVIDENCE_SOURCE_FAMILIES[source.sourceId] || source.sourceId, sourceRole:EVIDENCE_CAUSAL_SOURCE_IDS.has(source.sourceId)?'causal-research-index':'supporting-literature-index', attempted: searches.filter(s => s.sourceId === source.sourceId).length, failed: searches.filter(s => s.sourceId === source.sourceId && s.status === 'search-failed').length, leads: evidenceLeads.filter(l => l.sourceId === source.sourceId).length, candidateMatches: evidenceLeads.filter(l => l.sourceId === source.sourceId && ['candidate-match','verified'].includes(l.relevanceStatus)).length }]));
  return { schemaVersion: 'vidik.source-driven-evidence-discovery.v5', problem, candidateId: candidate.id, query, diversifiedQueries, sourceDiagnostics, sourceSearches: searches, evidenceLeads, evidenceSufficiency: sufficiency, evidenceComplete: sufficiency.evidenceComplete === true, recommendationEligible: false, effectsImported: false, discoveryHash: sha256({ problem, candidateId: candidate.id, searches, evidenceLeads }) };
}
async function discoverCandidateUniverseEvidence({ problem, candidates = [], sources = null, fetchImpl, now = new Date(), rows = 10, maxCandidates = 3 } = {}) {
  const selectedCandidates = (Array.isArray(candidates) ? candidates : []).filter(candidate => candidate?.id).slice(0, Math.max(1, Math.min(10, maxCandidates)));
  const results = [];
  for (const candidate of selectedCandidates) {
    results.push(await discoverCandidateEvidence({ problem, candidate, sources, fetchImpl, now, rows }));
  }
  const relevantLeads = results.flatMap(result => result.evidenceLeads || []).filter(lead => lead.relevanceStatus === 'candidate-match' || lead.relevanceStatus === 'verified');
  const independentSources = [...new Set(relevantLeads.map(lead => lead.sourceId))];
  return {
    schemaVersion: 'vidik.source-driven-evidence-universe.v1',
    problem,
    candidatesChecked: results.length,
    maxCandidates,
    candidateEvidence: results,
    independentEvidenceSources: independentSources,
    candidatesWithIndependentEvidence: results.filter(result => result.evidenceSufficiency?.independentSourceCount >= 2).map(result => result.candidateId),
    evidenceComplete: results.some(result => result.evidenceComplete === true),
    recommendationEligible: false,
    effectsImported: false
  };
}
module.exports = { EVIDENCE_SOURCE_IDS, EVIDENCE_SOURCE_FAMILIES, EVIDENCE_CAUSAL_SOURCE_IDS, queryFor, evidenceLeadRelevant, evidenceLeadRelevance, buildPubmedSummaryUrl, buildPubmedAbstractUrl, extractPubmedAbstracts, buildEvidenceSearchUrl, canonicalEvidenceSource, sourceIsAuthoritative, extractEvidenceLeads, sanitizeEvidenceLead, deduplicateEvidenceLeads, assessEvidenceSufficiency, discoverCandidateEvidence, discoverCandidateUniverseEvidence };
