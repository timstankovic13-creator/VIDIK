const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync(require.resolve('../data/VIDIK_LOCAL_TEST_COMMANDS_v1.md'),'utf8');
assert.ok((p.match(/node tests\//g) || []).length >= 17);
assert.ok(p.includes('do not create or consume GitHub Actions minutes'));
console.log('Local test command list passed');
