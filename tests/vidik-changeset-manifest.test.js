const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync(require.resolve('../data/VIDIK_CHANGESET_MANIFEST_2026-09-02.md'),'utf8');
assert.ok(p.includes('ab905357c16aa45b3128a21fc17b19fe4e970872'));
assert.ok(p.includes('without opening a PR or triggering GitHub Actions'));
console.log('Changeset manifest passed');
