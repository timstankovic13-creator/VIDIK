'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { discoverSourceDrivenInterventions } = require('../js/source-driven-intervention-discovery');
const CASES = [
  ['municipal','US','reduce flood damage'],
  ['municipal','US','reduce eviction filings'],
  ['municipal','AU','reduce bushfire smoke exposure'],
  ['business','US','improve small business survival'],
  ['business','US','reduce customer churn'],
  ['business','CA','improve accessibility for customers with disabilities'],
  ['research','UK','evaluate ways to reduce hospital waiting times'],
  ['research','CA','study energy poverty interventions']
];
test('targeted discovery recovery converts previously blocked cases into source-backed candidate universes', async () => {
  const results = [];
  for (const [workspace, jurisdiction, problem] of CASES) {
    const started = Date.now();
    const result = await discoverSourceDrivenInterventions({ problem, jurisdiction, workspace, rows: 4 });
    results.push({ workspace, jurisdiction, problem, candidates: result.candidates.length, comparableFallback: result.sourceApplicability?.comparableFallback || null, sourceStatuses: result.sourceSearches.map(s => ({ sourceId: s.sourceId, sourceType: s.sourceType, status: s.status, failureClasses: s.failureClasses || {} })), elapsedMs: Date.now() - started });
  }
  const recovered = results.filter(r => r.candidates > 0).length;
  console.log('VIDIK_TARGETED_RECOVERY', JSON.stringify({ recovered, total: results.length, results }, null, 2));
  assert.ok(recovered >= 4, 'expected at least 4/' + results.length + ' cases to recover candidates; got ' + recovered);
});
