const assert = require('node:assert/strict');
const fs = require('node:fs');
const p = fs.readFileSync(require.resolve('../data/VIDIK_PRE_CI_LOCAL_GATE_v1.md'),'utf8');
for (const term of ['Decision Benchmark','historical leakage','exact MSE/request-gate','municipal adapter','adversarial/reproducibility','not a substitute for CI']) assert.ok(p.includes(term), `missing ${term}`);
console.log('Pre-CI local gate passed');
