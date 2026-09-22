const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync(require.resolve('../data/VIDIK_COMMERCIAL_READINESS_GATE.md'),'utf8');
for (const term of ['Product reliability','Evidence reliability','Municipal portability','Customer experience','Operational proof','Commercial infrastructure']) assert.ok(p.includes(term), `missing ${term}`);
console.log('VIDIK commercial readiness gate passed');
