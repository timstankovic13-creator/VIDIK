const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync(require.resolve('../data/VIDIK_NO_BLIND_CI_RULE.md'),'utf8');
assert.ok(p.split('\n').some(x => x.includes('named release-gate purpose')));
console.log('No-blind-CI release purpose check passed');
