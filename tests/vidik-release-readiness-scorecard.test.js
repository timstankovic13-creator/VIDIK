const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync(require.resolve('../data/VIDIK_RELEASE_READINESS_SCORECARD_v1.md'),'utf8');
for (const term of ['Core decision lifecycle','Evidence/MSE governance','Decision benchmark','Municipal portability','Commercial readiness']) assert.ok(p.includes(term), `missing ${term}`);
console.log('Release readiness scorecard passed');
