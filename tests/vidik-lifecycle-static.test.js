const assert = require('node:assert/strict');
const fs = require('node:fs');
const lifecycle = fs.readFileSync(require.resolve('../data/VIDIK_DECISION_LIFECYCLE_v1.md'),'utf8');
const demo = fs.readFileSync(require.resolve('../data/VIDIK_CANONICAL_DEMO_WORKFLOW_v1.md'),'utf8');
const pkg = fs.readFileSync(require.resolve('../data/VIDIK_CUSTOMER_DECISION_PACKAGE_v1.md'),'utf8');
const adv = fs.readFileSync(require.resolve('../data/VIDIK_ADVERSARIAL_REPRODUCIBILITY_v1.md'),'utf8');
for (const [name,text,needles] of [
  ['lifecycle',lifecycle,['INTAKE','HUMAN_DECISION','OUTCOME_REVIEW','LEARNING']],
  ['demo',demo,['Evidence triage','Why-not','Audit snapshot']],
  ['package',pkg,['Executive page','Why this option','Outcome plan']],
  ['adversarial',adv,['Historical leakage','Re-run determinism','Tenant isolation']]
]) for (const n of needles) assert.ok(text.includes(n), `${name} missing ${n}`);
console.log('VIDIK lifecycle/demo/package/adversarial specifications passed');
