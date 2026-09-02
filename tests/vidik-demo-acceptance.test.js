const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync(require.resolve('../data/VIDIK_DEMO_ACCEPTANCE_v1.md'),'utf8');
for (const term of ['Supported-answer path','Blocked-answer path','no developer intervention','no hidden evidence substitution','no aggregate-to-marginal substitution']) assert.ok(p.includes(term), `missing ${term}`);
console.log('VIDIK demo acceptance criteria passed');
