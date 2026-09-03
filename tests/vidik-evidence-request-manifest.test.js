'use strict';
const assert = require('node:assert/strict');
const m = require('../data/VIDIK_EVIDENCE_REQUEST_MANIFEST.json');
const EXPECTED = {
  '009':['approach/intersection traffic volume','collision severity and site linkage','concurrent intervention history','camera activation/deactivation uptime'],
  '010':['approach/intersection traffic volume','collision severity and site linkage','concurrent intervention history','camera operating status and treatment history'],
  '014':['actual marginal bed availability/allocation by site/date','decision-unit occupancy/admissions','comparable demand periods/sites or capacity shock','exit destination and linked repeat-use outcomes where preregistered'],
  '006':['eligible-call exposure/assignment','comparable eligible calls or areas','repeat-call linkage','downstream emergency-service utilization']
};
const STATUS = new Set(['PUBLIC_AVAILABLE','PUBLIC_GAP','MUNICIPAL_REQUEST','NOT_MATERIAL']);
assert.equal(m.schema,'vidik-evidence-request-v1'); assert.equal(m.status,'READY_FOR_AUTHORIZED_REQUEST'); assert.equal(m.temporal_cutoff,'2023-12-06');
assert.equal(m.requests.length,4); assert.deepEqual(m.requests.map(x=>x.case),['009','010','014','006']);
for (const r of m.requests) {
  assert.ok(EXPECTED[r.case]);
  assert.equal(r.claim_level,'EFFECT_ESTIMATION');
  assert.equal(r.unit,{'009':'site-month','010':'intersection-month','014':'marginal bed-night','006':'eligible-call response'}[r.case]);
  assert.deepEqual(r.fields,EXPECTED[r.case]);
  assert.ok(Number.isInteger(r.priority) && r.priority>0);
  assert.ok(typeof r.stop_rule==='string' && r.stop_rule.trim());
  assert.deepEqual(Object.keys(r.field_status).sort(),[...r.fields].sort());
  for (const f of r.fields) assert.ok(STATUS.has(r.field_status[f]));
}
function validateRequest(r) {
  return Boolean(r && EXPECTED[r.case] && r.claim_level==='EFFECT_ESTIMATION' && r.unit && Number.isInteger(r.priority) && r.priority>0 &&
    Array.isArray(r.fields) && r.fields.length===EXPECTED[r.case].length && r.fields.every(f=>EXPECTED[r.case].includes(f)) &&
    r.field_status && r.fields.every(f=>STATUS.has(r.field_status[f])) && typeof r.stop_rule==='string' && r.stop_rule.trim() && r.temporal_cutoff==='2023-12-06');
}
assert.equal(validateRequest(m.requests[0]),true);
assert.equal(validateRequest({...m.requests[0],fields:[]}),false);
assert.equal(validateRequest({...m.requests[0],fields:m.requests[0].fields.filter(f=>f!=='concurrent intervention history')}),false);
assert.equal(validateRequest({...m.requests[0],field_status:{...m.requests[0].field_status,'concurrent intervention history':'BOGUS'}}),false);
assert.equal(validateRequest({...m.requests[0],stop_rule:''}),false);
assert.equal(validateRequest({...m.requests[0],priority:0}),false);
assert.equal(validateRequest({...m.requests[0],temporal_cutoff:'2024-01-01'}),false);
assert.equal(validateRequest({...m.requests[0],case:'999'}),false);
console.log('PASS — 4 claim-scaled MSE requests bind claim level, historical cutoff, field status, and stop rules');
