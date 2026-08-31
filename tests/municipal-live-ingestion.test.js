'use strict';

const assert = require('assert');
const { ADAPTERS, ingestCatalog } = require('../scripts/municipal-adapters');

(async () => {
  for (const city of Object.keys(ADAPTERS)) {
    const result = await ingestCatalog(city);
    assert.strictEqual(result.city, city);
    assert.ok(result.recordCount > 0, `${city}: no source records returned`);
    assert.strictEqual(result.provenance.status, 'validated');
    assert.strictEqual(result.provenance.identityAuthority, 'GeoNames');
    assert.strictEqual(result.provenance.populationEnrichment, 'WorldPop');
    assert.strictEqual(result.provenance.rowCount, result.recordCount);
    assert.match(result.provenance.normalizedSha256, /^[a-f0-9]{64}$/);
    console.log(`${city}: LIVE SOURCE OK (${result.recordCount} records) ${result.sourceUrl}`);
  }
  console.log('municipal-live-ingestion: PASS');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
