'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const required=[
 'data/VIDIK_10_TRACK_EXECUTION.md',
 'data/VIDIK_PUBLIC_SAFETY_5M_LAB.md',
 'data/VIDIK_PUBLIC_SAFETY_5M_SCENARIOS.json',
 'data/VIDIK_DECISION_BENCHMARK_V2.md',
 'data/VIDIK_EVIDENCE_ACQUISITION_PIPELINE.md',
 'data/VIDIK_EVIDENCE_REQUESTS.json',
 'data/VIDIK_CUSTOMER_LIFECYCLE.md',
 'data/VIDIK_DECISION_RED_TEAM.md',
 'data/VIDIK_TRANSPORTABILITY_MATRIX.md',
 'data/VIDIK_VALUE_BENCHMARK.md',
 'data/VIDIK_DEMO_PACKAGE.md',
 'data/VIDIK_OCTOBER_RELEASE_GATE.md',
 'js/vidik-public-safety-5m-lab.js',
 'tests/vidik-public-safety-5m-lab.test.js'
];
for(const p of required) assert.equal(fs.existsSync(path.join(root,p)),true,p);
const manifest=require(path.join(root,'data/VIDIK_EVIDENCE_REQUESTS.json'));
assert.equal(manifest.status,'READY_FOR_AUTHORIZED_REQUEST');
assert.deepEqual(manifest.requests.map(x=>x.case),['009','010','014','006']);
assert.ok(manifest.requests.every(x=>x.fields.length>0));
const text=fs.readFileSync(path.join(root,'data/VIDIK_10_TRACK_EXECUTION.md'),'utf8');
for(let i=1;i<=10;i++) assert.match(text,new RegExp('(^|\\n)'+i+'\\.\\s'));
console.log('PASS — 10-track offline execution package is structurally complete and real-data requests are explicit, ranked, and authorization-gated');
