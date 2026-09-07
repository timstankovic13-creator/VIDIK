#!/usr/bin/env node
'use strict';

const crypto = require('crypto');

const ADAPTERS = Object.freeze({
  Ottawa: Object.freeze({
    sourceType: 'ogc-api-records',
    catalogUrl: 'https://open.ottawa.ca/api/search/v1/catalog',
    discoveryUrl: 'https://open.ottawa.ca/api/search/v1/collections',
    datasetHint: 'collision',
    mode: 'controlled-server-side',
    identityAuthority: 'GeoNames',
    populationEnrichment: 'WorldPop',
    limit: 25,
  }),
  Toronto: Object.freeze({
    sourceType: 'ckan',
    catalogUrl: 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_search?q=traffic%20collisions',
    discoveryUrl: 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_search?q=traffic%20collisions',
    datasetHint: 'traffic collisions',
    mode: 'controlled-server-side',
    identityAuthority: 'GeoNames',
    populationEnrichment: 'WorldPop',
    limit: 25,
  }),
  Melbourne: Object.freeze({
    sourceType: 'opendatasoft-explore-api',
    catalogUrl: 'https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/pedestrian-counting-system-monthly-counts-per-hour/records?limit=10',
    discoveryUrl: 'https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/pedestrian-counting-system-monthly-counts-per-hour/records?limit=10',
    datasetHint: 'pedestrian counting system',
    mode: 'controlled-server-side',
    identityAuthority: 'GeoNames',
    populationEnrichment: 'WorldPop',
    limit: 10,
  }),
});

const ALLOWED_HOSTS = new Set([
  'open.ottawa.ca',
  'ckan0.cf.opendata.inter.prod-toronto.ca',
  'data.melbourne.vic.gov.au',
]);

function adapterFor(city) {
  const key = String(city || '').trim();
  const adapter = ADAPTERS[key];
  if (!adapter) throw new Error(`unsupported-municipality:${city}`);
  return { city: key, ...adapter };
}

function canonicalize(value) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('non-finite-record-value');
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  const ordered = {};
  for (const key of Object.keys(value).sort()) {
    const normalizedKey = String(key).trim();
    if (!normalizedKey) throw new Error('invalid-record-key');
    if (Object.prototype.hasOwnProperty.call(ordered, normalizedKey)) throw new Error(`normalized-key-collision:${normalizedKey}`);
    ordered[normalizedKey] = canonicalize(value[key]);
  }
  return ordered;
}

function normalizeRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('invalid-record');
  return canonicalize(record);
}

function normalizeRecords(records) {
  if (!Array.isArray(records)) throw new Error('records-must-be-array');
  return records.map(normalizeRecord);
}

function assertAllowedHttpsUrl(url) {
  let parsed;
  try { parsed = new URL(String(url)); } catch { throw new Error('invalid-source-url'); }
  if (parsed.protocol !== 'https:') throw new Error('source-url-must-use-https');
  if (!ALLOWED_HOSTS.has(parsed.hostname)) throw new Error(`source-host-not-allowlisted:${parsed.hostname}`);
  return parsed.toString();
}

function provenance({ city, sourceUrl, retrievedAt, records, discoveryUrl, datasetHint }) {
  const normalized = normalizeRecords(records);
  const safeSourceUrl = assertAllowedHttpsUrl(sourceUrl);
  const safeDiscoveryUrl = assertAllowedHttpsUrl(discoveryUrl || sourceUrl);
  const retrieved = new Date(String(retrievedAt));
  if (Number.isNaN(retrieved.getTime())) throw new Error('invalid-retrieved-at');
  return {
    schemaVersion: 'municipal-adapter.v3',
    city: String(city),
    sourceUrl: safeSourceUrl,
    discoveryUrl: safeDiscoveryUrl,
    datasetHint: String(datasetHint || ''),
    retrievedAt: retrieved.toISOString(),
    rowCount: normalized.length,
    normalizedSha256: crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex'),
    identityAuthority: ADAPTERS[city]?.identityAuthority || 'GeoNames',
    populationEnrichment: ADAPTERS[city]?.populationEnrichment || 'WorldPop',
    status: 'validated',
  };
}

function melbourneRecords(body) {
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.records)) return body.records;
  return null;
}

function validateCatalog(city, body) {
  adapterFor(city);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error(`invalid-catalog:${city}`);
  if (city === 'Toronto' && body.success !== true) throw new Error('toronto-catalog-not-success');
  if (city === 'Melbourne' && !melbourneRecords(body)) throw new Error('melbourne-catalog-shape-invalid');
  if (city === 'Ottawa' && !Array.isArray(body.collections) && !Array.isArray(body.links) && !body.id) throw new Error('ottawa-catalog-shape-invalid');
  return true;
}

function extractOttawaCollections(body) {
  return Array.isArray(body?.collections) ? body.collections : [];
}

function findOttawaCollection(body, hint) {
  const collections = extractOttawaCollections(body);
  const needle = String(hint || '').toLowerCase();
  return collections.find(collection => `${collection.title || ''} ${collection.description || ''}`.toLowerCase().includes(needle)) || collections[0] || null;
}

function extractTorontoPackages(body) {
  return Array.isArray(body?.result?.results) ? body.result.results : [];
}

function findTorontoResource(body) {
  const packages = extractTorontoPackages(body);
  for (const pkg of packages) {
    const resources = Array.isArray(pkg.resources) ? pkg.resources : [];
    const datastore = resources.find(resource => resource.datastore_active === true && resource.id);
    if (datastore) return { package: pkg, resource: datastore };
  }
  for (const pkg of packages) {
    const resources = Array.isArray(pkg.resources) ? pkg.resources : [];
    const resource = resources.find(item => item.id && item.url);
    if (resource) return { package: pkg, resource };
  }
  return null;
}

async function fetchJson(url, fetchImpl = globalThis.fetch) {
  const safeUrl = assertAllowedHttpsUrl(url);
  if (typeof fetchImpl !== 'function') throw new Error('fetch-unavailable');
  const attempts = 3;
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 20000) : null;
    try {
      const response = await fetchImpl(safeUrl, {
        headers: { accept: 'application/json', 'user-agent': 'VIDIK-municipal-live-validation/3.0' },
        signal: controller?.signal,
      });
      if (!response || !response.ok) throw new Error(`upstream-http:${response?.status ?? 'unknown'}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  throw lastError || new Error('upstream-fetch-failed');
}

async function inspectCatalog(city, fetchImpl = globalThis.fetch) {
  const adapter = adapterFor(city);
  const body = await fetchJson(adapter.catalogUrl, fetchImpl);
  validateCatalog(city, body);
  return { adapter, fetched: true, sourceUrl: adapter.catalogUrl, body };
}

async function resolveSource(city, fetchImpl = globalThis.fetch) {
  const adapter = adapterFor(city);
  if (city === 'Melbourne') return { sourceUrl: adapter.discoveryUrl, sourceKind: 'dataset-records', datasetId: 'pedestrian-counting-system-monthly-counts-per-hour' };

  const discovery = await fetchJson(adapter.discoveryUrl, fetchImpl);
  validateCatalog(city, discovery);

  if (city === 'Ottawa') {
    const collection = findOttawaCollection(discovery, adapter.datasetHint);
    if (!collection) throw new Error('ottawa-source-not-found');
    const collectionId = collection.id || collection.collectionId;
    if (!collectionId) throw new Error('ottawa-source-id-missing');
    const sourceUrl = `https://open.ottawa.ca/api/search/v1/collections/${encodeURIComponent(collectionId)}/items?limit=${adapter.limit}`;
    return { sourceUrl: assertAllowedHttpsUrl(sourceUrl), sourceKind: 'collection-items', datasetId: String(collectionId) };
  }

  const match = findTorontoResource(discovery);
  if (!match) throw new Error('toronto-source-not-found');
  const resourceId = match.resource.id;
  const sourceUrl = match.resource.datastore_active === true
    ? `https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/datastore_search?resource_id=${encodeURIComponent(resourceId)}&limit=${adapter.limit}`
    : match.resource.url;
  return { sourceUrl: assertAllowedHttpsUrl(sourceUrl), sourceKind: 'resource', datasetId: String(resourceId), packageName: match.package.name || match.package.title || null };
}

function extractSourceRecords(city, body) {
  if (city === 'Ottawa') return Array.isArray(body?.features) ? body.features : Array.isArray(body?.items) ? body.items : [];
  if (city === 'Toronto') return Array.isArray(body?.result?.records) ? body.result.records : [];
  return melbourneRecords(body) || [];
}

async function ingestCatalog(city, fetchImpl = globalThis.fetch, now = new Date()) {
  const adapter = adapterFor(city);
  const resolved = await resolveSource(city, fetchImpl);
  const body = await fetchJson(resolved.sourceUrl, fetchImpl);
  const records = extractSourceRecords(city, body);
  if (!records.length) throw new Error(`empty-source:${city}`);
  const retrievedAt = now.toISOString();
  return {
    city,
    sourceUrl: resolved.sourceUrl,
    sourceKind: resolved.sourceKind,
    datasetId: resolved.datasetId,
    recordCount: records.length,
    records: normalizeRecords(records),
    provenance: provenance({ city, sourceUrl: resolved.sourceUrl, discoveryUrl: adapter.discoveryUrl, datasetHint: adapter.datasetHint, retrievedAt, records }),
  };
}

module.exports = {
  ADAPTERS,
  adapterFor,
  canonicalize,
  normalizeRecord,
  normalizeRecords,
  assertAllowedHttpsUrl,
  provenance,
  validateCatalog,
  fetchJson,
  inspectCatalog,
  resolveSource,
  extractSourceRecords,
  ingestCatalog,
};
