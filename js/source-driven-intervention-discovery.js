'use strict';

const { retrieve, parsePayload, sha256 } = require('./data-acquisition');
const { SOURCE_REGISTRY } = require('./source-registry');
const CKAN_SOURCE_IDS = new Set(['ca-program-discovery','ca-ontario-program-discovery','us-open-data-program-discovery','uk-open-data-program-discovery','au-open-data-program-discovery']);
function normalizeText(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function normalizeInterventionName(value) {
  return normalizeText(value).toLowerCase()
    .replace(/\b(the|a|an)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(programme|initiative|project|pilot)\b/g, 'program')
    .replace(/\b(centre|center)\b/g, 'centre')
    .replace(/\s+/g, ' ').trim();
}
function buildCkanSearchUrl(source, problem, { rows = 25 } = {}) {
  if (!source?.url || !CKAN_SOURCE_IDS.has(source.sourceId)) throw new Error('unsupported-ckan-intervention-source');
  if (!String(problem || '').trim()) throw new Error('source-driven-problem-required');
  if (!Number.isInteger(rows) || rows < 1 || rows > 100) throw new Error('source-driven-page-size-invalid');
  const url = new URL(source.url); url.searchParams.set('q', String(problem).trim()); url.searchParams.set('rows', String(rows)); return url.toString();
}
const NON_INTERVENTION_TERMS = ['dataset','data set','census','statistics','statistic','report','budget','indicator','information','dashboard','administrative records','records','open data','mapping data','survey','profile','monitoring data','raw data'];
const INTERVENTION_TERMS = ['program','programme','service','initiative','intervention','pilot','project','grant','funding','subsidy','benefit','shelter','clinic','treatment','outreach','prevention','enforcement','patrol','training','support service','housing first','rapid rehousing','transit','bus lane','bike lane','protected lane','infrastructure','facility','voucher','inspection','licensing','permit','regulation','cash transfer','food bank','cooling centre','cooling center','emergency response','staffing','capacity'];
const STRONG_INTERVENTION_TERMS = ['program','programme','service','initiative','intervention','pilot','project','grant','funding','subsidy','benefit','shelter','clinic','treatment','outreach','prevention','enforcement','patrol','training','support service','housing first','rapid rehousing','transit','bus lane','bike lane','protected lane','infrastructure','facility','voucher','inspection','licensing','permit','regulation','cash transfer','food bank','cooling centre','cooling center','emergency response','staffing','capacity'];
const INTERVENTION_FAMILIES = [
  ['housing','housing','shelter','housing first','rapid rehousing'],
  ['food-access','food','food bank','food access'],
  ['public-safety','crime','violence','prevention','enforcement','patrol'],
  ['mobility-safety','bike lane','protected lane','bus lane','transit','traffic'],
  ['health-service','clinic','treatment','health','emergency response'],
  ['climate-resilience','cooling centre','cooling center','heat','smoke','emergency response'],
  ['employment','training','worker','employment','staffing'],
  ['economic-support','grant','funding','subsidy','benefit','voucher','cash transfer'],
  ['infrastructure','infrastructure','facility','project'],
  ['regulatory','inspection','licensing','permit','regulation']
];
function inferInterventionFamily(text) {
  const normalized = normalizeText(text).toLowerCase();
  const matches = INTERVENTION_FAMILIES.filter(([, ...terms]) => terms.some(term => normalized.includes(term)));
  return matches.length ? matches.map(([family]) => family) : ['other'];
}
function classifyCkanRecord(row) {
  const title = normalizeText(row?.title || row?.name); const notes = normalizeText(row?.notes || row?.description); const tags = Array.isArray(row?.tags) ? row.tags.map(tag => normalizeText(tag?.display_name || tag?.name)).filter(Boolean).slice(0, 12) : [];
  const text = `${title} ${notes} ${tags.join(' ')}`.toLowerCase(); const negative = NON_INTERVENTION_TERMS.filter(term => text.includes(term)); const positive = INTERVENTION_TERMS.filter(term => text.includes(term)); const strongPositive = STRONG_INTERVENTION_TERMS.filter(term => text.includes(term));
  if (!title) return { accepted: false, reason: 'missing-title', positiveSignals: [], negativeSignals: [], families: [] };
  if (negative.length > 0 && strongPositive.length === 0) return { accepted: false, reason: 'non-intervention-resource', positiveSignals: [], negativeSignals: negative, families: [] };
  if (negative.length > 0 && /\b(report|dataset|census|budget|statistics|indicator|dashboard|survey|profile)\b/i.test(title)) return { accepted: false, reason: 'non-intervention-resource', positiveSignals: positive, negativeSignals: negative, families: [] };
  if (/\b(data|statistics|report|dashboard|information|records?)\b/i.test(title) && !/\b(program|programme|service|initiative|intervention|project|pilot)\b/i.test(title)) return { accepted: false, reason: 'non-intervention-resource', positiveSignals: positive, negativeSignals: negative, families: [] };
  if (positive.length === 0) return { accepted: false, reason: 'insufficient-intervention-signal', positiveSignals: [], negativeSignals: negative, families: [] };
  const families = inferInterventionFamily(text);
  return { accepted: true, reason: 'intervention-signal', positiveSignals: positive, negativeSignals: negative, families };
}
function extractCkanInterventionLeads(payload, source, problem) {
  const results = Array.isArray(payload?.result?.results) ? payload.result.results : [];
  return results.map((row, index) => {
    const classification = classifyCkanRecord(row); if (!classification.accepted) return null;
    const id = row.id || row.name || `${source.sourceId}-${index + 1}`; const title = normalizeText(row.title || row.name); const notes = normalizeText(row.notes || row.description); const tags = Array.isArray(row.tags) ? row.tags.map(tag => normalizeText(tag?.display_name || tag?.name)).filter(Boolean).slice(0, 12) : [];
    const family = classification.families; const canonicalName = normalizeInterventionName(title);
    return { id: `source:${source.sourceId}:${id}`, name: title, canonicalName, interventionFamily: family, problemTags: [String(problem).toLowerCase(), ...tags].filter(Boolean).slice(0, 13), domains: [source.domain], requiredEvidence: ['causal','implementation','cost','equity'], discoveryText: `${title} ${notes} ${tags.join(' ')}`, evidenceStatus: 'potential', discovery: { source: source.sourceId, sourceType: 'intervention-library', jurisdiction: source.jurisdiction, leadOnly: true, effectsImported: false, discoveryOnly: true, datasetId: row.id || row.name || null, classification: { basis: classification.reason, positiveSignals: classification.positiveSignals, negativeSignals: classification.negativeSignals, families: family }, provenance: [{ sourceId: source.sourceId, sourceType: 'intervention-library', jurisdiction: source.jurisdiction, evidenceStatus: 'potential' }] } };
  }).filter(Boolean);
}
function canonicalSource(source) { return SOURCE_REGISTRY.find(candidate => candidate.sourceId === source?.sourceId) || null; }
function sourceMatchesJurisdiction(source, jurisdiction) {
  const canonical = canonicalSource(source); if (!canonical) return false;
  if (source.jurisdiction !== canonical.jurisdiction) return false;
  return !jurisdiction || canonical.jurisdiction === jurisdiction || canonical.jurisdiction === 'international';
}
function selectInterventionSources({ problem, jurisdiction = null } = {}) {
  const normalizedProblem = String(problem || '').toLowerCase(); const terms = normalizedProblem.split(/[^a-z0-9-]+/).filter(Boolean); const eligible = SOURCE_REGISTRY.filter(source => CKAN_SOURCE_IDS.has(source.sourceId) && sourceMatchesJurisdiction(source, jurisdiction));
  const matched = eligible.filter(source => source.discoveryTags.some(tag => terms.includes(String(tag).toLowerCase()) || normalizedProblem.includes(String(tag).toLowerCase())));
  return matched.length ? matched : eligible;
}
function buildApplicabilityAudit({ problem, jurisdiction = null, suppliedSources = null } = {}) {
  const normalizedProblem = String(problem || '').toLowerCase(); const terms = normalizedProblem.split(/[^a-z0-9-]+/).filter(Boolean); const eligible = SOURCE_REGISTRY.filter(source => CKAN_SOURCE_IDS.has(source.sourceId) && sourceMatchesJurisdiction(source, jurisdiction)); const matched = eligible.filter(source => source.discoveryTags.some(tag => terms.includes(String(tag).toLowerCase()) || normalizedProblem.includes(String(tag).toLowerCase())));
  const rejectedSuppliedSources = Array.isArray(suppliedSources) && jurisdiction ? suppliedSources.filter(source => !sourceMatchesJurisdiction(source, jurisdiction)).map(source => ({ sourceId: source.sourceId, jurisdiction: source.jurisdiction, canonicalJurisdiction: canonicalSource(source)?.jurisdiction || null, reason: canonicalSource(source) ? 'jurisdiction-mismatch' : 'unregistered-source' })) : [];
  return { problem, jurisdiction, eligibleSources: eligible.map(source => source.sourceId), matchedSources: matched.map(source => source.sourceId), rejectedSuppliedSources, fallbackUsed: matched.length === 0 && eligible.length > 0, decision: matched.length ? 'tag-matched' : (eligible.length ? 'broad-fallback' : 'no-eligible-source'), consideredCount: eligible.length };
}
function deduplicateInterventionLeads(leads = []) {
  const groups = new Map();
  for (const lead of leads) {
    const key = lead.canonicalName || normalizeInterventionName(lead.name);
    if (!key) continue;
    const existing = groups.get(key);
    if (!existing) { groups.set(key, { ...lead, id: `universe:${sha256(key).slice(0, 16)}`, sourceIds: [lead.discovery?.source].filter(Boolean), sourceCount: 1, sourceProvenance: lead.discovery?.provenance || [], interventionFamily: lead.interventionFamily || ['other'] }); continue; }
    existing.sourceIds = [...new Set([...existing.sourceIds, lead.discovery?.source].filter(Boolean))]; existing.sourceCount = existing.sourceIds.length;
    existing.sourceProvenance = [...existing.sourceProvenance, ...(lead.discovery?.provenance || [])];
    existing.interventionFamily = [...new Set([...existing.interventionFamily, ...(lead.interventionFamily || [])])];
    existing.discovery = { ...existing.discovery, corroboratedBySources: existing.sourceIds.length, leadOnly: true, effectsImported: false, discoveryOnly: true };
  }
  return [...groups.values()];
}
function buildInterventionUniverseAssessment({ problem, jurisdiction = null, sourceSearches = [], candidates = [], requestedSourceCount = 0 } = {}) {
  const usable = sourceSearches.filter(search => search.status !== 'search-failed');
  const failed = sourceSearches.filter(search => search.status === 'search-failed');
  const deduped = deduplicateInterventionLeads(candidates);
  const families = [...new Set(deduped.flatMap(candidate => candidate.interventionFamily || ['other']))];
  const coverage = requestedSourceCount > 0 ? usable.length / requestedSourceCount : 0;
  const evidenceReadyLeads = deduped.filter(candidate => candidate.requiredEvidence?.length).length;
  return { problem, jurisdiction, sourcesAttempted: sourceSearches.length, usableSources: usable.length, failedSources: failed.length, sourceCoverageRatio: coverage, rawCandidateCount: candidates.length, uniqueCandidateCount: deduped.length, interventionFamilies: families, evidenceRequirementsAttached: evidenceReadyLeads === deduped.length, discoveryComplete: sourceSearches.length > 0 && failed.length === 0 && deduped.length > 0, recommendationEligible: false, stoppingReason: sourceSearches.length === 0 ? 'no-source-searches' : failed.length === sourceSearches.length ? 'all-sources-failed' : deduped.length === 0 ? 'no-intervention-candidates' : failed.length ? 'partial-source-failure' : 'candidate-universe-discovered' };
}
async function discoverSourceDrivenInterventions({ problem, jurisdiction = null, sources = null, fetchImpl, now = new Date(), rows = 25 } = {}) {
  const supplied = Array.isArray(sources) ? sources : null;
  const selected = supplied ? supplied.filter(source => sourceMatchesJurisdiction(source, jurisdiction)).map(source => canonicalSource(source)).filter(Boolean) : selectInterventionSources({ problem, jurisdiction });
  const applicability = buildApplicabilityAudit({ problem, jurisdiction, suppliedSources: supplied }); const sourceSearches = [], rawCandidates = [];
  for (const source of selected) {
    const url = buildCkanSearchUrl(source, problem, { rows });
    try { const snapshot = await retrieve({ ...source, url }, { fetchImpl, now }); const payload = parsePayload(snapshot.bytes, snapshot.retrieval.contentType); if (payload.format !== 'json') throw new Error('source-driven-response-not-json'); const leads = extractCkanInterventionLeads(payload.value, source, problem); rawCandidates.push(...leads); sourceSearches.push({ sourceId: source.sourceId, sourceType: 'intervention-library', jurisdiction: source.jurisdiction, query: problem, status: leads.length ? 'candidates-found' : 'searched-empty', candidatesReturned: leads.length, recordsConsidered: Array.isArray(payload.value?.result?.results) ? payload.value.result.results.length : 0, provenance: snapshot.retrieval, failureReason: null }); }
    catch (error) { sourceSearches.push({ sourceId: source.sourceId, sourceType: 'intervention-library', jurisdiction: source.jurisdiction, query: problem, status: 'search-failed', candidatesReturned: 0, provenance: null, failureReason: error?.message || 'source-driven-search-failed' }); }
  }
  const candidates = deduplicateInterventionLeads(rawCandidates);
  const universe = buildInterventionUniverseAssessment({ problem, jurisdiction, sourceSearches, candidates: rawCandidates, requestedSourceCount: selected.length });
  return { schemaVersion: 'vidik.source-driven-intervention-discovery.v4', problem, sourcesSelected: selected.map(source => source.sourceId), sourceApplicability: applicability, sourceSearches, rawCandidateCount: rawCandidates.length, candidates, interventionUniverse: universe, discoveryHash: sha256({ problem, sourceApplicability: applicability, sourceSearches, candidates: candidates.map(candidate => ({ id: candidate.id, name: candidate.name, canonicalName: candidate.canonicalName, interventionFamily: candidate.interventionFamily, discovery: candidate.discovery })) }), recommendationEligible: false };
}
module.exports = { CKAN_SOURCE_IDS, INTERVENTION_FAMILIES, buildCkanSearchUrl, normalizeInterventionName, inferInterventionFamily, classifyCkanRecord, extractCkanInterventionLeads, canonicalSource, sourceMatchesJurisdiction, selectInterventionSources, buildApplicabilityAudit, deduplicateInterventionLeads, buildInterventionUniverseAssessment, discoverSourceDrivenInterventions };
