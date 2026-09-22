const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync(require.resolve('../data/VIDIK_QUICK_TURNAROUND_SLA_v1.md'),'utf8');
assert.ok(p.includes('Day 0')); assert.ok(p.includes('Day 3')); assert.ok(p.includes('Day 5')); assert.ok(p.includes('Speed never lowers the evidence threshold'));
console.log('Quick-turnaround SLA passed');
