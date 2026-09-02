const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync(require.resolve('../data/VIDIK_CUSTOMER_DECISION_PACKAGE_v1.md'),'utf8');
for (const term of ['Recommendation','Status-quo comparison','Why this option','Why not','Uncertainty','Audit snapshot','Outcome plan']) assert.ok(p.toLowerCase().includes(term.toLowerCase()), `missing ${term}`);
console.log('Customer decision package integrity passed');
