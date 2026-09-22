const assert = require('node:assert/strict');
for (const p of [
  '../js/vidik-decision-benchmark-v1',
  '../js/vidik-canonical-decision-workflow',
  '../js/vidik-adapter-contract',
  '../js/rc4-evidence-acquisition-spec',
  '../js/rc4-evidence-request-gate'
]) assert.doesNotThrow(() => require(p));
console.log('All new business-readiness modules load successfully');
