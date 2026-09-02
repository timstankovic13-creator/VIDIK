const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync(require.resolve('../data/VIDIK_BUSINESS_READINESS_INDEX.md'),'utf8');
assert.ok(p.includes('Prepared for pilot/productization work'));
assert.ok(p.includes('Not yet commercially proven'));
console.log('Business readiness index passed');
