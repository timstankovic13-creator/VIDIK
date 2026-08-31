#!/usr/bin/env node
'use strict';

const crypto = require('crypto');

const ADAPTERS = Object.freeze({
  Ottawa: Object.freeze({
    sourceType: 'ogc-api-records',
    catalogUrl: 'https://open.ottawa.ca/api/search/v1/catalog',
    mode: 'controlled-server-side',
  }),
  Toronto: Object.freeze({
    sourceType: 'ckan',
    catalogUrl: 'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_search',
    mode: 'controlled-server-side',
  }),
  Melbourne: Object.freeze({
    sourceType: 'socrata',
    catalogUrl: 'https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets',
    mode: 'controlled-server-side',
  }),
});

function adapterFor(city) {
  const a = ADAPTERS[String(city || '').trim()];
  if (!a) throw new Error(`unsupported-municipality:${city}`);
  return { city, ...a };
}

function normalizeRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('invalid-record');
  const ordered = {};
  for (const key of Object.keys(record).sort()) ordered[String(key).trim()] = record[key];
  return ordered;
}

function normalizeRecords(records) {
  if (!Array.isArray(records)) throw new Error('records-must-be-array');
  return records.map(normalizeRecord);
}

function provenance({ city, sourceUrl, retrievedAt, records }) {
  const normalized = normalizeRecords(records);
  const payload = JSON.stringify(normalized);
  return {
    schemaVersion: 'municipal-adapter.v1',
    city: String(city),
    sourceUrl: String(sourceUrl),
    retrievedAt: String(retrievedAt),
    rowCount: normalized.length,
    normalizedSha256: crypto.createHash('sha256').update(payload).digest('hex'),
    status: 'validated',
  };
}

async function fetchJson(url, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') throw new Error('fetch-unavailable');
  const response = await fetchImpl(url, { headers: { accept: 'application/json' } });
  if (!response || !response.ok) throw new Error(`upstream-http:${response?.status ?? 'unknown'}`);
  return response.json();
}

async function inspectCatalog(city, fetchImpl = globalThis.fetch) {
  const adapter = adapterFor(city);
  const body = await fetchJson(adapter.catalogUrl, fetchImpl);
  return { adapter, fetched: true, sourceUrl: adapter.catalogUrl, body };
}

module.exports = { ADAPTERS, adapterFor, normalizeRecord, normalizeRecords, provenance, fetchJson, inspectCatalog };
