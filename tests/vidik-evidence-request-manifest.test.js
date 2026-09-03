'use strict';
const assert = require('node:assert/strict');
const m = require('../data/VIDIK_EVIDENCE_REQUEST_MANIFEST.json');
assert.equal(m.schema,'vidik-evidence-request-v1');
assert.equal(m.requests.length,4);
assert.deepEqual(m.requests.map(x=>x.case),['009','010','014','006']);
for (const r of m.requests) { assert.ok(r.unit); assert.ok(Number.isInteger(r.priority)); assert.ok(r.fields.length); assert.ok(r.stop_rule); }
assert.ok(m.requests.find(r=>r.case==='009').fields.includes('concurrent intervention history'));
assert.ok(m.requests.find(r=>r.case==='014').fields.includes('actual marginal bed availability/allocation by site/date'));
assert.ok(m.requests.find(r=>r.case==='006').fields.includes('eligible-call exposure/assignment'));
console.log('PASS — 4 claim-scaled MSE requests validated');
