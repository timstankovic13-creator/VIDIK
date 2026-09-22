const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync(require.resolve('../data/VIDIK_NEXT_WORK_ITEMS_v1.md'),'utf8');
assert.equal((p.match(/^\d+\./gm)||[]).length, 6);
assert.ok(p.includes('October CI candidate'));
console.log('Next work items passed');
