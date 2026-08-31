#!/usr/bin/env node
'use strict';

const fs = require('fs');
const crypto = require('crypto');

const EXPECTED_RECORDS = 4690;
const REQUIRED_FIELDS = ['city', 'country', 'population', 'wup_city_code', 'source_row_index'];

function validateExpansion(records) {
  if (!Array.isArray(records)) throw new Error('expansion-records-must-be-array');
  if (records.length !== EXPECTED_RECORDS) throw new Error(`expansion-record-count:${records.length}:expected:${EXPECTED_RECORDS}`);
  const ids = new Set();
  for (const row of records) {
    if (!row || typeof row !== 'object') throw new Error('expansion-invalid-record');
    for (const field of REQUIRED_FIELDS) if (row[field] === undefined || row[field] === null || row[field] === '') throw new Error(`expansion-missing:${field}`);
    const id = `${String(row.country).trim().toLowerCase()}::${String(row.city).trim().toLowerCase()}::${String(row.wup_city_code).trim()}::${String(row.source_row_index).trim()}`;
    if (ids.has(id)) throw new Error(`expansion-duplicate-identity:${id}`);
    ids.add(id);
    const population = Number(row.population);
    if (!Number.isFinite(population) || population <= 0 || population >= 50000) throw new Error(`expansion-invalid-population:${id}`);
  }
  return { enabled: true, records: records.length };
}

function loadExpansion(file) {
  if (!file) throw new Error('expansion-source-required');
  if (!fs.existsSync(file)) throw new Error(`expansion-source-not-found:${file}`);
  const raw = fs.readFileSync(file, 'utf8');
  const records = JSON.parse(raw);
  const validation = validateExpansion(records);
  return { ...validation, source: file, sha256: crypto.createHash('sha256').update(raw).digest('hex') };
}

if (require.main === module) {
  const file = process.argv[2];
  try { console.log(JSON.stringify(loadExpansion(file), null, 2)); }
  catch (error) { console.error(error.message); process.exit(3); }
}

module.exports = { EXPECTED_RECORDS, validateExpansion, loadExpansion };
