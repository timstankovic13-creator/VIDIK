const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync(require.resolve('../data/VIDIK_COMMERCIAL_HANDOFF_CHECKLIST_v1.md'),'utf8');
for (const term of ['baseline workflow','municipal adapter','MSE package','audit/export','outcome owner','success criteria']) assert.ok(p.includes(term), `missing ${term}`);
console.log('Commercial handoff checklist passed');
