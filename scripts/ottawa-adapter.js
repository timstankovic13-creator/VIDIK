#!/usr/bin/env node
/** VIDIK Ottawa municipal adapter: canonical municipal context contract. */
const crypto = require('crypto');

const CSDUID = '2021A00053506008';
const SOURCES = {
  census: 'https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/details/page.cfm?DGUIDlist=2021A00053506008',
  population: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710015501',
  police: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=3510007701'
};

function numeric(v, name) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error(`invalid-${name}`);
  return n;
}

function buildOttawaContext(input = {}) {
  const population2021 = numeric(input.population2021 ?? 1017449, 'population2021');
  const population2016 = numeric(input.population2016 ?? 934243, 'population2016');
  const changePct = ((population2021 - population2016) / population2016) * 100;
  return {
    adapter: 'canada.ontario.ottawa',
    adapter_version: '1.0.0',
    geography: { csduid: CSDUID, name: 'Ottawa', province: 'Ontario', country: 'Canada' },
    population: { census_2021: population2021, census_2016: population2016, change_pct: Number(changePct.toFixed(4)) },
    provenance: Object.fromEntries(Object.entries(SOURCES).map(([k, url]) => [k, { url, status: 'source-registered' }])),
    integrity: 'source-registered'
  };
}

function fingerprint(context) {
  return crypto.createHash('sha256').update(JSON.stringify(context)).digest('hex');
}

if (require.main === module) {
  const context = buildOttawaContext();
  console.log(JSON.stringify({ context, fingerprint: fingerprint(context) }, null, 2));
}
module.exports = { CSDUID, SOURCES, buildOttawaContext, fingerprint };
