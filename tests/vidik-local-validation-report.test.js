const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync(require.resolve('../data/VIDIK_LOCAL_VALIDATION_REPORT_2026-09-02.md'),'utf8');
assert.ok(p.includes('LOCAL VALIDATION: PASS')); assert.ok(p.includes('CI STATUS: NOT RUN')); assert.ok(p.includes('Actions capacity is exhausted'));
console.log('Local validation report passed');
