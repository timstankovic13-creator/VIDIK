'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname,'..');
const files = [
  'js/vidik-public-safety-5m-lab.js',
  'data/VIDIK_PUBLIC_SAFETY_5M_SCENARIOS.json',
  'data/VIDIK_CUSTOMER_DECISION_LIFECYCLE.md',
  'data/VIDIK_DECISION_RED_TEAM.md',
  'data/VIDIK_EVIDENCE_ACQUISITION_PIPELINE.md',
  'data/VIDIK_EVIDENCE_REQUEST_MANIFEST.json',
  'data/VIDIK_TRANSPORTABILITY_MATRIX.md',
  'data/VIDIK_VALUE_BENCHMARK.md',
  'data/VIDIK_OCTOBER_RELEASE_GATE.md'
];
for (const f of files) assert.equal(fs.existsSync(path.join(root,f)),true,`missing ${f}`);
const lifecycle = fs.readFileSync(path.join(root,'data/VIDIK_CUSTOMER_DECISION_LIFECYCLE.md'),'utf8');
for (const stage of ['Question','Scope','Evidence','Eligibility','Allocation','Human Decision','Implementation','Review','Outcome','Recalibration']) assert.ok(lifecycle.includes(stage),stage);
const manifest = require('../data/VIDIK_EVIDENCE_REQUEST_MANIFEST.json');
assert.deepEqual(manifest.requests.map(x=>x.case),['009','010','014','006']);
const { runBenchmark } = require('../js/vidik-decision-benchmark-runner');
const benchmark = runBenchmark();
assert.equal(benchmark.total,10);
assert.equal(benchmark.failed,0,JSON.stringify(benchmark.results));
assert.equal(benchmark.productionPromotionCount,0);
console.log('PASS — structure, lifecycle, manifest, and executable 10-scenario benchmark are certified offline');
