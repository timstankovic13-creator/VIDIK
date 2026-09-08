'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require('@playwright/test');
const { ingestCatalog } = require('../scripts/municipal-adapters');
const { resolveMunicipalMapping, assertContextOnlyMapping } = require('../scripts/municipal-parameter-registry');

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`timeout:${label}:${ms}ms`)), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function startServer() {
  const server = spawn(process.platform === 'win32' ? 'python' : 'python3', ['-m', 'http.server', '4173', '--bind', '127.0.0.1'], { cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(), 1000);
    server.once('error', reject);
    server.stdout.on('data', chunk => { if (String(chunk).includes('Serving HTTP')) { clearTimeout(timer); resolve(); } });
  });
  return server;
}

(async () => {
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'index.html')));
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const city of ['Ottawa', 'Toronto', 'Melbourne']) {
      console.log(`${city}: starting live ingestion`);
      const ingestion = await withTimeout(ingestCatalog(city, globalThis.fetch, new Date()), 90000, `${city}:live-ingestion`);
      assert.equal(ingestion.provenance.status, 'validated');
      assert.ok(ingestion.recordCount > 0);
      const mapping = resolveMunicipalMapping(city, ingestion.records);
      assertContextOnlyMapping(mapping);
      console.log(`${city}: ingestion validated; mapped ${mapping.field} -> ${mapping.parameterName}`);

      const page = await browser.newPage();
      await withTimeout(page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' }), 30000, `${city}:browser-load`);
      await withTimeout(page.waitForFunction(() => document.readyState === 'complete'), 10000, `${city}:browser-ready`);
      await withTimeout(page.evaluate(({ city, provenance, mapping }) => {
        window.VIDIK_LIVE_MUNICIPAL_CONTEXT = {
          [city]: {
            status: 'validated-context', city, sourceUrl: provenance.sourceUrl, datasetId: provenance.datasetId,
            retrievedAt: provenance.retrievedAt, normalizedSha256: provenance.normalizedSha256, recordCount: provenance.rowCount,
            parameterLineage: { parameterName: mapping.parameterName, field: mapping.field, unit: mapping.unit, aggregation: mapping.aggregation, semantic: mapping.semantic, role: mapping.role, causalEligible: mapping.causalEligible },
          },
        };
        document.getElementById('city').value = city;
        render();
      }, { city, provenance: ingestion.provenance, mapping }), 10000, `${city}:browser-render`);

      const state = await page.evaluate(() => ({ gate: document.getElementById('gate').textContent, recommendation: document.getElementById('rec').textContent, audit: document.getElementById('audit').textContent, pipeline: document.getElementById('pipeline').textContent }));
      assert.match(state.gate, /DECISION ADMISSIBLE|BLOCKED/);
      assert.ok(state.recommendation);
      const audit = JSON.parse(state.audit);
      assert.equal(audit.city, city);
      assert.equal(audit.municipal_live_evidence.status, 'validated-context');
      assert.equal(audit.municipal_live_evidence.normalizedSha256, ingestion.provenance.normalizedSha256);
      assert.equal(audit.municipal_live_evidence.recordCount, ingestion.provenance.rowCount);
      assert.equal(audit.municipal_parameter_lineage.parameterName, mapping.parameterName);
      assert.equal(audit.municipal_parameter_lineage.field, mapping.field);
      assert.equal(audit.municipal_parameter_lineage.causalEligible, false);
      assert.match(state.pipeline, /semantic local context parameter|transportability gate/);
      await page.close();
      console.log(`${city}: LIVE SOURCE -> SEMANTIC CONTEXT -> REAL BROWSER ENGINE -> AUDIT OK | records=${ingestion.recordCount} | field=${mapping.field} | parameter=${mapping.parameterName} | sha256=${ingestion.provenance.normalizedSha256}`);
    }
    console.log('production-real-municipal-integration: PASS');
  } finally {
    await browser.close();
    server.kill('SIGTERM');
  }
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
