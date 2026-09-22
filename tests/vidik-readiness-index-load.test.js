const assert = require('node:assert/strict');
const fs = require('node:fs');
for (const p of [
  '../data/VIDIK_DECISION_LIFECYCLE_v1.md', '../data/VIDIK_CANONICAL_DEMO_WORKFLOW_v1.md', '../data/VIDIK_CUSTOMER_DECISION_PACKAGE_v1.md',
  '../data/VIDIK_MUNICIPAL_ADAPTER_v1.md', '../data/VIDIK_ADVERSARIAL_REPRODUCIBILITY_v1.md', '../data/VIDIK_PILOT_MEASUREMENT_v1.md',
  '../data/VIDIK_COMMERCIAL_READINESS_GATE.md', '../data/VIDIK_RELEASE_CANDIDATE_MANIFEST_v1.md'
]) assert.ok(fs.readFileSync(require.resolve(p),'utf8').length > 100);
console.log('Business-readiness document index loads successfully');
