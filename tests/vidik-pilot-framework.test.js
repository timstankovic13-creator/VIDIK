const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync(require.resolve('../data/VIDIK_PILOT_MEASUREMENT_v1.md'),'utf8');
for (const term of ['time to first answer','time to defensible answer','appropriate-block rate','human correction','reproducibility']) assert.ok(p.includes(term), `missing ${term}`);
console.log('VIDIK pilot measurement framework passed');
