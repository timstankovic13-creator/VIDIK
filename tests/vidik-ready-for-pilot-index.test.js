const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync(require.resolve('../data/VIDIK_READY_FOR_PILOT_INDEX.md'),'utf8');
assert.ok(p.includes('real municipal decision')); assert.ok(p.includes('explicit claim level')); assert.ok(p.includes('Causal effectiveness claims remain blocked'));
console.log('Ready-for-pilot index passed');
