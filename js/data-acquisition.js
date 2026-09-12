'use strict';

const crypto = require('crypto');

const DATA_DOMAINS = Object.freeze([
  'problem-outcome',
  'local-baseline',
  'population-equity',
  'intervention-universe',
  'implementation',
  'cost-resource',
  'causal-evidence',
  'constraints-feasibility',
  'geospatial-context',
  'comparator-innovation',
  'outcome-learning'
]);

const SOURCE_TIERS = Object.freeze({
  official_machine_readable: 1,
  official_structured: 2,
  official_publication: 3,
  independent_causal_research: 4,
  comparator_implementation: 5,
  secondary_discovery: 6
});

const EVIDENCE_STATUS = Object.freeze(['verified', 'supported', 'estimated', 'potential', 'blocked']);

function sha256(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function finite(value) { return Number.isFinite(Number(value)); }

function requiredDataManifest({ objective, problem, domains = DATA_DOMAINS, horizon = null } = {}) {
  if (!objective || !problem) throw new Error('acquisition-objective-and-problem-required');
  const selected = [...new Set(domains)].filter(domain => DATA_DOMAINS.includes(domain));
  if (!selected.length) throw new Error('acquisition-domain-required');
  return {
    schemaVersion: 'vidik.data-requirement-manifest.v1',
    objective,
    problem,
    decisionHorizon: horizon,
    requirements: selected.map((domain, index) => ({ id: `REQ-${String(index + 1).padStart(2, '0')}-${domain}`, domain, required: true, status: 'unknown' }))
  };
}

function rankSources(sources = []) {
  return sources.map((source, index) => ({ ...source, discoveryOrder: index, tier: source.tier || 'secondary_discovery', tierRank: SOURCE_TIERS[source.tier || 'secondary_discovery'] || 99 }))
    .sort((a, b) => a.tierRank - b.tierRank || a.discoveryOrder - b.discoveryOrder);
}

function validateSourceDescriptor(source) {
  if (!source || !source.url) throw new Error('source-url-required');
  const url = new URL(source.url);
  if (url.protocol !== 'https:') throw new Error('source-url-must-use-https');
  if (!source.provider || !source.jurisdiction || !source.domain) throw new Error('source-provider-jurisdiction-domain-required');
  if (!DATA_DOMAINS.includes(source.domain)) throw new Error(`unsupported-data-domain:${source.domain}`);
  if (!SOURCE_TIERS[source.tier]) throw new Error(`unsupported-source-tier:${source.tier}`);
  return true;
}

async function retrieve(source, { fetchImpl = globalThis.fetch, now = new Date() } = {}) {
  validateSourceDescriptor(source);
  if (typeof fetchImpl !== 'function') throw new Error('fetch-unavailable');
  let current = source.url;
  const redirects = [];
  for (let i = 0; i <= 5; i++) {
    const response = await fetchImpl(current, {
      headers: { accept: 'application/json,text/csv,application/xml,text/html,application/pdf;q=0.9,*/*;q=0.7', 'user-agent': 'VIDIK-data-acquisition/1.0' },
      redirect: 'manual'
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers?.get?.('location') || response.headers?.get?.('Location');
      if (!location) throw new Error('upstream-redirect-missing-location');
      current = new URL(location, current).toString();
      redirects.push(current);
      continue;
    }
    if (!response.ok) throw new Error(`upstream-http:${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const contentType = String(response.headers?.get?.('content-type') || '').toLowerCase();
    return {
      retrieval: {
        retrievedAt: new Date(now).toISOString(),
        requestedUrl: source.url,
        finalUrl: current,
        redirects,
        status: response.status,
        contentType,
        byteLength: bytes.length,
        contentHash: sha256(bytes.toString('base64'))
      },
      bytes
    };
  }
  throw new Error('upstream-too-many-redirects');
}

function normalizeRecord({ source, retrieval, value, unit, period, geography, population, aggregation, extractionMethod, definition, asOf = null } = {}) {
  validateSourceDescriptor(source);
  if (!retrieval?.contentHash) throw new Error('retrieval-snapshot-required');
  if (value === undefined || value === null) throw new Error('normalized-value-required');
  if (!unit || !period || !geography || !aggregation || !extractionMethod) throw new Error('normalized-semantic-metadata-required');
  return {
    schemaVersion: 'vidik.acquired-data-record.v1',
    id: `DATA-${sha256({ source: source.url, retrieval: retrieval.contentHash, value, unit, period, geography }).slice(0, 16)}`,
    domain: source.domain,
    provider: source.provider,
    source: {
      url: source.url,
      finalUrl: retrieval.finalUrl,
      jurisdiction: source.jurisdiction,
      tier: source.tier,
      contentHash: retrieval.contentHash,
      retrievedAt: retrieval.retrievedAt,
      datasetId: source.datasetId || null,
      version: source.version || null,
      license: source.license || null
    },
    value,
    unit,
    period,
    asOf,
    geography,
    population: population || null,
    aggregation,
    definition: definition || null,
    extractionMethod,
    status: 'unknown'
  };
}

function validateRecord(record, { now = new Date(), maxAgeDays = null } = {}) {
  const failures = [];
  if (!record?.source?.contentHash) failures.push('source-snapshot-missing');
  if (!record?.source?.url) failures.push('source-url-missing');
  if (!record?.provider || !record?.domain) failures.push('semantic-provenance-missing');
  if (!record?.unit || !record?.period || !record?.geography || !record?.aggregation) failures.push('semantic-definition-incomplete');
  if (record.value === null || record.value === undefined) failures.push('value-missing');
  if (typeof record.value === 'number' && !Number.isFinite(record.value)) failures.push('value-not-finite');
  if (maxAgeDays !== null && record.asOf) {
    const age = (new Date(now).getTime() - new Date(record.asOf).getTime()) / 86400000;
    if (!Number.isFinite(age)) failures.push('invalid-as-of-date');
    else if (age > maxAgeDays) failures.push('stale-source');
  }
  return { valid: failures.length === 0, failures };
}

function classifyEvidence({ record, independentVerification = false, claimType = 'context', method = null } = {}) {
  if (!record) return { status: 'blocked', failures: ['record-missing'] };
  if (claimType === 'causal' && !record.causalDesign && !method) return { status: 'potential', failures: ['causal-design-metadata-missing'] };
  if (independentVerification) return { status: 'verified', failures: [] };
  if (record.derived) return { status: 'estimated', failures: [] };
  if (record.primary === false) return { status: 'supported', failures: [] };
  return { status: 'supported', failures: [] };
}

function buildAcquisitionResult({ manifest, candidates = [], records = [], gaps = [] } = {}) {
  const ranked = rankSources(candidates);
  const byDomain = Object.fromEntries(DATA_DOMAINS.map(domain => [domain, ranked.filter(source => source.domain === domain)]));
  const coveredDomains = [...new Set(records.map(record => record.domain))];
  return {
    schemaVersion: 'vidik.data-acquisition-result.v1',
    manifest,
    sourceCandidates: ranked,
    candidatesByDomain: byDomain,
    records,
    gaps: [...new Set(gaps)],
    coverage: {
      requiredDomains: manifest.requirements.map(r => r.domain),
      coveredDomains,
      missingDomains: manifest.requirements.map(r => r.domain).filter(domain => !coveredDomains.includes(domain)),
      complete: manifest.requirements.every(r => coveredDomains.includes(r.domain))
    },
    acquisitionHash: sha256({ manifest, ranked, records, gaps })
  };
}

module.exports = {
  DATA_DOMAINS,
  SOURCE_TIERS,
  EVIDENCE_STATUS,
  sha256,
  requiredDataManifest,
  rankSources,
  validateSourceDescriptor,
  retrieve,
  normalizeRecord,
  validateRecord,
  classifyEvidence,
  buildAcquisitionResult
};
