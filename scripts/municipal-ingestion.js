'use strict';

const crypto = require('crypto');
const { adapterFor, ingestCatalog, normalizeRecords, provenance } = require('./municipal-adapters');

const DEFAULT_MAX_AGE_HOURS = Object.freeze({
  Ottawa: 168,
  Toronto: 168,
  Melbourne: 744,
});

function finiteDate(value, field) {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error(`invalid-${field}`);
  return date;
}

function freshnessPolicy(city, overrides = {}) {
  adapterFor(city);
  const maxAgeHours = Number(overrides.maxAgeHours ?? DEFAULT_MAX_AGE_HOURS[city]);
  if (!Number.isFinite(maxAgeHours) || maxAgeHours <= 0) throw new Error('invalid-max-age-hours');
  return { city, maxAgeHours };
}

function assessFreshness({ city, retrievedAt, now = new Date(), maxAgeHours } = {}) {
  const policy = freshnessPolicy(city, { maxAgeHours });
  const retrieved = finiteDate(retrievedAt, 'retrieved-at');
  const current = finiteDate(now, 'now');
  const ageHours = (current.getTime() - retrieved.getTime()) / 3600000;
  if (ageHours < 0) throw new Error('retrieved-at-in-future');
  return {
    status: ageHours <= policy.maxAgeHours ? 'fresh' : 'stale',
    ageHours,
    maxAgeHours: policy.maxAgeHours,
  };
}

function sha256(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function buildEvidenceEnvelope({ city, ingestion, now = new Date(), maxAgeHours } = {}) {
  const adapter = adapterFor(city);
  if (!ingestion || ingestion.city !== city) throw new Error('ingestion-city-mismatch');
  const records = normalizeRecords(ingestion.records);
  if (!records.length) throw new Error(`empty-source:${city}`);
  const freshness = assessFreshness({ city, retrievedAt: ingestion.provenance?.retrievedAt, now, maxAgeHours });
  if (freshness.status !== 'fresh') throw new Error(`stale-source:${city}`);
  const normalizedSha256 = sha256(records);
  if (ingestion.provenance?.normalizedSha256 !== normalizedSha256) throw new Error(`provenance-hash-mismatch:${city}`);
  return {
    schemaVersion: 'municipal-evidence.v1',
    city,
    source: {
      datasetId: ingestion.datasetId,
      sourceUrl: ingestion.sourceUrl,
      sourceKind: ingestion.sourceKind,
      identityAuthority: adapter.identityAuthority,
      populationEnrichment: adapter.populationEnrichment,
    },
    freshness,
    evidence: {
      recordCount: records.length,
      normalizedSha256,
      retrievedAt: ingestion.provenance.retrievedAt,
      records,
    },
    status: 'validated',
  };
}

async function ingestMunicipality(city, fetchImpl, now = new Date(), options = {}) {
  const ingestion = await ingestCatalog(city, fetchImpl, now);
  return buildEvidenceEnvelope({ city, ingestion, now, maxAgeHours: options.maxAgeHours });
}

async function ingestAllMunicipalities(fetchImpl, now = new Date(), options = {}) {
  const result = {};
  for (const city of ['Ottawa', 'Toronto', 'Melbourne']) {
    result[city] = await ingestMunicipality(city, fetchImpl, now, options[city] || {});
  }
  return result;
}

module.exports = {
  DEFAULT_MAX_AGE_HOURS,
  freshnessPolicy,
  assessFreshness,
  buildEvidenceEnvelope,
  ingestMunicipality,
  ingestAllMunicipalities,
};
