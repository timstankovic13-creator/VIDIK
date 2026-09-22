const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync(require.resolve('../data/VIDIK_NO_BLIND_CI_RULE.md'),'utf8');
assert.ok(p.includes('exact commit under test is known'));
assert.ok(p.includes('A failed run must be inspected at the exact SHA'));
console.log('No-blind-CI rule passed');
