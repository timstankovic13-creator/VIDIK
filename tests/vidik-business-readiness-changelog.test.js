const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync(require.resolve('../data/VIDIK_BUSINESS_READINESS_CHANGELOG_2026-09-02.md'),'utf8');
for (const term of ['Executable Decision Benchmark','Canonical 12-state decision lifecycle','Municipal adapter contract','Adversarial/reproducibility gate','Local verification is not CI verification']) assert.ok(p.includes(term), `missing ${term}`);
console.log('Business readiness changelog passed');
