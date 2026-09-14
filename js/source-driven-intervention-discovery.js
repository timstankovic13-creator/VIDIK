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

function extractCkanInterventionLeads(payload, source, problem) {
  const results = Array.isArray(payload?.result?.results) ? payload.result.results : [];
  return results.map((row, index) => {
    const id = row.id || row.name || `${source.sourceId}-${index + 1}`;
    const title = normalizeText(row.title || row.name);
    const notes = normalizeText(row.notes || row.description);
    const tags = Array.isArray(row.tags) ? row.tags.map(tag => normalizeText(tag?.display_name || tag?.name)).filter(Boolean).slice(0, 12) : [];
    if (!title) return null;
    return {
      id: `source:${source.sourceId}:${id}`, name: title,
      problemTags: [String(problem).toLowerCase(), ...tags].filter(Boolean).slice(0, 13), domains: [source.domain],
      requiredEvidence: ['causal', 'implementation', 'cost', 'equity'], discoveryText: `${title} ${notes} ${tags.join(' ')}`,
      evidenceStatus: 'potential',
      discovery: { source: source.sourceId, sourceType: 'intervention-library', jurisdiction: source.jurisdiction, leadOnly: true, effectsImported: false, discoveryOnly: true, datasetId: row.id || row.name || null,
        provenance: [{ sourceId: source.sourceId, sourceType: 'intervention-library', jurisdiction: source.jurisdiction, evidenceStatus: 'potential' }] }
    };
  }).filter(Boolean);
}

function selectInterventionSources({ problem, jurisdiction = null } = {}) {
  const normalizedProblem = String(problem || '').toLowerCase();
  const terms = normalizedProblem.split(/[^a-z0-9-]+/).filter(Boolean);
  const eligible = SOURCE_REGISTRY.filter(source =>
    CKAN_SOURCE_IDS.has(source.sourceId) &&
    (!jurisdiction || source.jurisdiction === jurisdiction || source.jurisdiction === 'international')
  );
  const matched = eligible.filter(source => source.discoveryTags.some(tag => terms.includes(String(tag).toLowerCase()) || normalizedProblem.includes(String(tag).toLowerCase())));
  // Applicability is an audit decision, not a silent zero-result. If no topical tag matches,
  // search the broad intervention catalogues anyway and record that the selection was fallback-driven.
  return matched.length ? matched : eligible;
}

function buildApplicabilityAudit({ problem, jurisdiction = null } = {}) {
  const normalizedProblem = String(problem || '').toLowerCase();
  const terms = normalizedProblem.split(/[^a-z0-9-]+/).filter(Boolean);
  const eligible = SOURCE_REGISTRY.filter(source => CKAN_SOURCE_IDS.has(source.sourceId) && (!jurisdiction || source.jurisdiction === jurisdiction || source.jurisdiction === 'international'));
  const matched = eligible.filter(source => source.discoveryTags.some(tag => terms.includes(String(tag).toLowerCase()) || normalizedProblem.includes(String(tag).toLowerCase())));
  return {
    problem, jurisdiction, eligibleSources: eligible.map(source => source.sourceId), matchedSources: matched.map(source => source.sourceId),
    fallbackUsed: matched.length === 0 && eligible.length > 0,
    decision: matched.length ? 'tag-matched' : (eligible.length ? 'broad-fallback' : 'no-eligible-source'),
    consideredCount: eligible.length
  };
}

async function discoverSourceDrivenInterventions({ problem, jurisdiction = null, sources = null, fetchImpl, now = new Date(), rows = 25 } = {}) {
  const selected = Array.isArray(sources) ? sources : selectInterventionSources({ problem, jurisdiction });
  const applicability = buildApplicabilityAudit({ problem, jurisdiction });
  const sourceSearches = [], candidates = [];
  for (const source of selected) {
    const url = buildCkanSearchUrl(source, problem, { rows });
    try {
      const snapshot = await retrieve({ ...source, url }, { fetchImpl, now });
      const payload = parsePayload(snapshot.bytes, snapshot.retrieval.contentType);
      if (payload.format !== 'json') throw new Error('source-driven-response-not-json');
      const leads = extractCkanInterventionLeads(payload.value, source, problem);
      candidates.push(...leads);
      sourceSearches.push({ sourceId: source.sourceId, sourceType: 'intervention-library', jurisdiction: source.jurisdiction, query: problem, status: leads.length ? 'candidates-found' : 'searched-empty', candidatesReturned: leads.length, provenance: snapshot.retrieval, failureReason: null });
    } catch (error) {
      sourceSearches.push({ sourceId: source.sourceId, sourceType: 'intervention-library', jurisdiction: source.jurisdiction, query: problem, status: 'search-failed', candidatesReturned: 0, provenance: null, failureReason: error?.message || 'source-driven-search-failed' });
    }
  }
  return {
    schemaVersion: 'vidik.source-driven-intervention-discovery.v2', problem, sourcesSelected: selected.map(source => source.sourceId),
    sourceApplicability: applicability, sourceSearches, candidates,
    discoveryHash: sha256({ problem, sourceApplicability: applicability, sourceSearches, candidates: candidates.map(candidate => ({ id: candidate.id, name: candidate.name, discovery: candidate.discovery })) }),
    recommendationEligible: false
  };
}

module.exports = { CKAN_SOURCE_IDS, buildCkanSearchUrl, extractCkanInterventionLeads, selectInterventionSources, buildApplicabilityAudit, discoverSourceDrivenInterventions };
