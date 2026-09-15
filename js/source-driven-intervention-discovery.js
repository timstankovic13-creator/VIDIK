'use strict';

const { retrieve, parsePayload, sha256 } = require('./data-acquisition');
const { SOURCE_REGISTRY } = require('./source-registry');

const CKAN_SOURCE_IDS = new Set([
  'ca-program-discovery', 'ca-ontario-program-discovery', 'us-open-data-program-discovery',
  'uk-open-data-program-discovery', 'au-open-data-program-discovery'
]);

function normalizeText(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }

function buildCkanSearchUrl(source, problem, { rows = 25 } = {}) {
  if (!source?.url || !CKAN_SOURCE_IDS.has(source.sourceId)) throw new Error('unsupported-ckan-intervention-source');
  if (!String(problem || '').trim()) throw new Error('source-driven-problem-required');
  if (!Number.isInteger(rows) || rows < 1 || rows > 100) throw new Error('source-driven-page-size-invalid');
  const url = new URL(source.url);
  url.searchParams.set('q', String(problem).trim());
  url.searchParams.set('rows', String(rows));
  return url.toString();
}

const NON_INTERVENTION_TERMS = [
  'dataset', 'data set', 'census', 'statistics', 'statistic', 'report', 'budget', 'indicator',
  'information', 'dashboard', 'administrative records', 'records', 'open data', 'mapping data'
];
const INTERVENTION_TERMS = [
  'program', 'programme', 'service', 'initiative', 'intervention', 'pilot', 'project', 'grant',
  'funding', 'subsidy', 'benefit', 'shelter', 'clinic', 'treatment', 'outreach', 'prevention',
  'enforcement', 'patrol', 'training', 'support service', 'housing first', 'rapid rehousing',
  'transit', 'bus lane', 'bike lane', 'protected lane', 'infrastructure', 'facility', 'voucher',
  'inspection', 'licensing', 'permit', 'regulation', 'cash transfer', 'food bank', 'cooling centre',
  'cooling center', 'emergency response', 'staffing', 'capacity'
];

function classifyCkanRecord(row) {
  const title = normalizeText(row?.title || row?.name);
  const notes = normalizeText(row?.notes || row?.description);
  const tags = Array.isArray(row?.tags) ? row.tags.map(tag => normalizeText(tag?.display_name || tag?.name)).filter(Boolean).slice(0, 12) : [];
  const text = `${title} ${notes} ${tags.join(' ')}`.toLowerCase();
  const negative = NON_INTERVENTION_TERMS.filter(term => text.includes(term));
  const positive = INTERVENTION_TERMS.filter(term => text.includes(term));
  if (!title) return { accepted: false, reason: 'missing-title', positiveSignals: [], negativeSignals: [] };
  if (negative.length > 0 && positive.length === 0) return { accepted: false, reason: 'non-intervention-resource', positiveSignals: [], negativeSignals: negative };
  if (negative.length > 0 && /\b(report|dataset|census|budget|statistics|indicator|dashboard)\b/i.test(title)) {
    return { accepted: false, reason: 'non-intervention-resource', positiveSignals: positive, negativeSignals: negative };
  }
  if (positive.length === 0) return { accepted: false, reason: 'insufficient-intervention-signal', positiveSignals: [], negativeSignals: negative };
  return { accepted: true, reason: 'intervention-signal', positiveSignals: positive, negativeSignals: negative };
}

function extractCkanInterventionLeads(payload, source, problem) {
  const results = Array.isArray(payload?.result?.results) ? payload.result.results : [];
  return results.map((row, index) => {
    const id = row.id || row.name || `${source.sourceId}-${index + 1}`;
    const title = normalizeText(row.title || row.name);
    const notes = normalizeText(row.notes || row.description);
    const tags = Array.isArray(row.tags) ? row.tags.map(tag => normalizeText(tag?.display_name || tag?.name)).filter(Boolean).slice(0, 12) : [];
    const classification = classifyCkanRecord(row);
    if (!classification.accepted) return null;
    return {
      id: `source:${source.sourceId}:${id}`, name: title,
      problemTags: [String(problem).toLowerCase(), ...tags].filter(Boolean).slice(0, 13), domains: [source.domain],
      requiredEvidence: ['causal', 'implementation', 'cost', 'equity'], discoveryText: `${title} ${notes} ${tags.join(' ')}`,
      evidenceStatus: 'potential',
      discovery: { source: source.sourceId, sourceType: 'intervention-library', jurisdiction: source.jurisdiction, leadOnly: true, effectsImported: false, discoveryOnly: true, datasetId: row.id || row.name || null,
        classification: { basis: classification.reason, positiveSignals: classification.positiveSignals, negativeSignals: classification.negativeSignals },
        provenance: [{ sourceId: source.sourceId, sourceType: 'intervention-library', jurisdiction: source.jurisdiction, evidenceStatus: 'potential' }] }
    };
  }).filter(Boolean);
}

function sourceMatchesJurisdiction(source, jurisdiction) {
  return !jurisdiction || source.jurisdiction === jurisdiction || source.jurisdiction === 'international';
}

function selectInterventionSources({ problem, jurisdiction = null } = {}) {
  const normalizedProblem = String(problem || '').toLowerCase();
  const terms = normalizedProblem.split(/[^a-z0-9-]+/).filter(Boolean);
  const eligible = SOURCE_REGISTRY.filter(source =>
    CKAN_SOURCE_IDS.has(source.sourceId) && sourceMatchesJurisdiction(source, jurisdiction)
  );
  const matched = eligible.filter(source => source.discoveryTags.some(tag => terms.includes(String(tag).toLowerCase()) || normalizedProblem.includes(String(tag).toLowerCase())));
  return matched.length ? matched : eligible;
}

function buildApplicabilityAudit({ problem, jurisdiction = null, suppliedSources = null } = {}) {
  const normalizedProblem = String(problem || '').toLowerCase();
  const terms = normalizedProblem.split(/[^a-z0-9-]+/).filter(Boolean);
  const eligible = SOURCE_REGISTRY.filter(source => CKAN_SOURCE_IDS.has(source.sourceId) && sourceMatchesJurisdiction(source, jurisdiction));
  const matched = eligible.filter(source => source.discoveryTags.some(tag => terms.includes(String(tag).toLowerCase()) || normalizedProblem.includes(String(tag).toLowerCase())));
  const rejectedSuppliedSources = Array.isArray(suppliedSources) && jurisdiction
    ? suppliedSources.filter(source => !sourceMatchesJurisdiction(source, jurisdiction)).map(source => ({ sourceId: source.sourceId, jurisdiction: source.jurisdiction, reason: 'jurisdiction-mismatch' }))
    : [];
  return {
    problem, jurisdiction, eligibleSources: eligible.map(source => source.sourceId), matchedSources: matched.map(source => source.sourceId),
    rejectedSuppliedSources, fallbackUsed: matched.length === 0 && eligible.length > 0,
    decision: matched.length ? 'tag-matched' : (eligible.length ? 'broad-fallback' : 'no-eligible-source'),
    consideredCount: eligible.length
  };
}

async function discoverSourceDrivenInterventions({ problem, jurisdiction = null, sources = null, fetchImpl, now = new Date(), rows = 25 } = {}) {
  const supplied = Array.isArray(sources) ? sources : null;
  const selected = supplied
    ? supplied.filter(source => sourceMatchesJurisdiction(source, jurisdiction))
    : selectInterventionSources({ problem, jurisdiction });
  const applicability = buildApplicabilityAudit({ problem, jurisdiction, suppliedSources: supplied });
  const sourceSearches = [], candidates = [];
  for (const source of selected) {
    const url = buildCkanSearchUrl(source, problem, { rows });
    try {
      const snapshot = await retrieve({ ...source, url }, { fetchImpl, now });
      const payload = parsePayload(snapshot.bytes, snapshot.retrieval.contentType);
      if (payload.format !== 'json') throw new Error('source-driven-response-not-json');
      const leads = extractCkanInterventionLeads(payload.value, source, problem);
      candidates.push(...leads);
      sourceSearches.push({ sourceId: source.sourceId, sourceType: 'intervention-library', jurisdiction: source.jurisdiction, query: problem, status: leads.length ? 'candidates-found' : 'searched-empty', candidatesReturned: leads.length, recordsConsidered: Array.isArray(payload.value?.result?.results) ? payload.value.result.results.length : 0, provenance: snapshot.retrieval, failureReason: null });
    } catch (error) {
      sourceSearches.push({ sourceId: source.sourceId, sourceType: 'intervention-library', jurisdiction: source.jurisdiction, query: problem, status: 'search-failed', candidatesReturned: 0, provenance: null, failureReason: error?.message || 'source-driven-search-failed' });
    }
  }
  return {
    schemaVersion: 'vidik.source-driven-intervention-discovery.v3', problem, sourcesSelected: selected.map(source => source.sourceId),
    sourceApplicability: applicability, sourceSearches, candidates,
    discoveryHash: sha256({ problem, sourceApplicability: applicability, sourceSearches, candidates: candidates.map(candidate => ({ id: candidate.id, name: candidate.name, discovery: candidate.discovery })) }),
    recommendationEligible: false
  };
}

module.exports = { CKAN_SOURCE_IDS, buildCkanSearchUrl, classifyCkanRecord, extractCkanInterventionLeads, selectInterventionSources, buildApplicabilityAudit, discoverSourceDrivenInterventions };
