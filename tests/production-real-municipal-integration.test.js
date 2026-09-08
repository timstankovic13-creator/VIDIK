'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require('@playwright/test');
const { ingestCatalog } = require('../scripts/municipal-adapters');

async function startServer() {
  const server = spawn(process.platform === 'win32' ? 'python' : 'python3', ['-m', 'http.server', '4173', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
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
      const ingestion = await ingestCatalog(city, globalThis.fetch, new Date());
      assert.equal(ingestion.provenance.status, 'validated');
      assert.ok(ingestion.recordCount > 0);

      const page = await browser.newPage();
      await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => document.readyState === 'complete');
      await page.evaluate(({ city, provenance }) => {
        window.VIDIK_LIVE_MUNICIPAL_CONTEXT = {
          [city]: {
            status: 'validated-context',
            city,
            sourceUrl: provenance.sourceUrl,
            datasetId: provenance.datasetId,
            retrievedAt: provenance.retrievedAt,
            normalizedSha256: provenance.normalizedSha256,
            recordCount: provenance.rowCount,
          },
        };
        document.getElementById('city').value = city;
        render();
      }, { city, provenance: ingestion.provenance });

      const state = await page.evaluate(() => ({
        gate: document.getElementById('gate').textContent,
        recommendation: document.getElementById('rec').textContent,
        audit: document.getElementById('audit').textContent,
        pipeline: document.getElementById('pipeline').textContent,
      }));
      assert.match(state.gate, /DECISION ADMISSIBLE|BLOCKED/);
      assert.ok(state.recommendation);
      const audit = JSON.parse(state.audit);
      assert.equal(audit.city, city);
      assert.equal(audit.municipal_live_evidence.status, 'validated-context');
      assert.equal(audit.municipal_live_evidence.normalizedSha256, ingestion.provenance.normalizedSha256);
      assert.equal(audit.municipal_live_evidence.recordCount, ingestion.provenance.rowCount);
      assert.match(state.pipeline, /Live municipal evidence|Verified evidence/);
      await page.close();
      console.log(`${city}: LIVE SOURCE -> REAL BROWSER ENGINE -> DECISION/AUDIT OK | records=${ingestion.recordCount} | sha256=${ingestion.provenance.normalizedSha256}`);
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
