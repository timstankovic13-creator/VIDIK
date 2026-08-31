#!/usr/bin/env node
'use strict';

const EXPECTED_RECORDS = 4690;
const SOURCE_URL = 'https://jeodpp.jrc.ec.europa.eu/ftp/jrc-opendata/GHSL/GHS_WUP_MTUC_GLOBE_R2025A/V1-1/GHS_WUP_MTUC_GLOBE_R2025A_V1_1_statistics.zip';

function validateSub50k(records) {
  if (!Array.isArray(records)) throw new Error('sub50k-records-must-be-array');
  if (records.length !== EXPECTED_RECORDS) throw new Error(`sub50k-record-count:${records.length}:expected:${EXPECTED_RECORDS}`);
  const ids = new Set();
  for (const row of records) {
    if (!row || typeof row !== 'object') throw new Error('sub50k-invalid-record');
    for (const field of ['city','country','population']) if (row[field] === undefined || row[field] === null || row[field] === '') throw new Error(`sub50k-missing:${field}`);
    const id = `${String(row.country).trim().toLowerCase()}::${String(row.city).trim().toLowerCase()}`;
    if (ids.has(id)) throw new Error(`sub50k-duplicate:${id}`);
    ids.add(id);
    const population = Number(row.population);
    if (!Number.isFinite(population) || population <= 0 || population >= 50000) throw new Error(`sub50k-invalid-population:${id}`);
  }
  return { enabled: true, records: records.length };
}

module.exports = { EXPECTED_RECORDS, SOURCE_URL, validateSub50k };
