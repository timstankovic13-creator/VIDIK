const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync(require.resolve('../data/VIDIK_NOW_NEXT_LATER.md'),'utf8');
assert.ok(p.indexOf('NOW') < p.indexOf('NEXT')); assert.ok(p.indexOf('NEXT') < p.indexOf('LATER'));
console.log('VIDIK sequencing passed');
