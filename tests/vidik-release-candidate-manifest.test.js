const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync(require.resolve('../data/VIDIK_RELEASE_CANDIDATE_MANIFEST_v1.md'),'utf8');
for (const term of ['benchmark fixtures frozen','browser acceptance','full regression','actual merge SHA','No blind rerun']) assert.ok(p.includes(term), `missing ${term}`);
console.log('Release candidate manifest passed');
