const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync(require.resolve('../data/VIDIK_SCOPE_CONTROL_v1.md'),'utf8');
for (const term of ['municipal data requests','historical decision mutation','unsupported effect estimates','GitHub Actions reruns']) assert.ok(p.includes(term), `missing ${term}`);
console.log('VIDIK scope control passed');
