const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync(require.resolve('../data/VIDIK_BUSINESS_READINESS_SUMMARY.md'),'utf8');
assert.ok(p.includes('executable decision benchmark'));
assert.ok(p.includes('real customer turnaround improvement'));
assert.ok(p.includes('October CI-green release candidate'));
console.log('Business readiness summary passed');
