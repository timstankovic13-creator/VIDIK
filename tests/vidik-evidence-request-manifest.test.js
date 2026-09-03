'use strict';
const assert = require('node:assert/strict');
const m = require('../data/VIDIK_EVIDENCE_REQUEST_MANIFEST.json');

const EXPECTED = {
  '009': ['approach/intersection traffic volume','collision severity and site linkage','concurrent intervention history','camera activation/deactivation uptime'],
  '010': ['approach/intersection traffic volume','collision severity and site linkage','concurrent intervention history','camera operating status and treatment history'],
  '014': ['actual marginal bed availability/allocation by site/date','decision-unit occupancy/admissions','comparable demand periods/sites or capacity shock','exit destination and linked repeat-use outcomes where preregistered'],
  '006': ['eligible-call exposure/assignment','comparable eligible calls or areas','repeat-call linkage','downstream emergency-service utilization']
};

assert.equal(m.schema,'vidik-evidence-request-v1');
assert.equal(m.status,'READY_FOR_AUTHORIZED_REQUEST');
assert.equal(m.requests.length,4);
assert.deepEqual(m.requests.map(x=>x.case),['009','010','014','006']);
for (const r of m.requests) {
  assert.ok(EXPECTED[r.case]);
  assert.equal(r.unit, {'009':'site-month','010':'intersection-month','014':'marginal bed-night','006':'eligible-call response'}[r.case]);
  assert.deepEqual(r.fields, EXPECTED[r.case]);
  assert.ok(Number.isInteger(r.priority) && r.priority > 0);
  assert.ok(r.fields.length > 0);
  assert.ok(typeof r.stop_rule === 'string' && r.stop_rule.trim().length > 0);
}

// Adversarial contract checks: a request without a material field or stop rule is not MSE-valid.
function validateRequest(r) {
  return Boolean(r && EXPECTED[r.case] && r.unit && Number.isInteger(r.priority) && r.priority > 0 &&
    Array.isArray(r.fields) && r.fields.length > 0 && r.fields.every(f => EXPECTED[r.case].includes(f)) &&
    typeof r.stop_rule === 'string' && r.stop_rule.trim());
}
assert.equal(validateRequest(m.requests[0]),true);
assert.equal(validateRequest({ ...m.requests[0], fields: [] }),false);
assert.equal(validateRequest({ ...m.requests[0], fields: m.requests[0].fields.filter(f => f !== 'concurrent intervention history') }),false);
assert.equal(validateRequest({ ...m.requests[0], stop_rule: '' }),false);
assert.equal(validateRequest({ ...m.requests[0], priority: 0 }),false);
assert.equal(validateRequest({ ...m.requests[0], case: '999' }),false);

assert.ok(m.requests.find(r=>r.case==='009').fields.includes('concurrent intervention history'));
assert.ok(m.requests.find(r=>r.case==='014').fields.includes('actual marginal bed availability/allocation by site/date'));
assert.ok(m.requests.find(r=>r.case==='006').fields.includes('eligible-call exposure/assignment'));
console.log('PASS — 4 claim-scaled MSE requests validated, including adversarial schema/stop-rule checks');
