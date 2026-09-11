'use strict';
const assert = require('assert');
const H = require('../js/vidik-production-hardening-16');

const decision = { identityBrief: { decisionId: 'D-001', immutableSnapshot: true }, integrity: { decisionIntegrity: true, decisionIntelligenceHash: 'abc' } };
const artifact = { decision, audit: {}, counterfactual: {}, evidence: {}, parameters: {}, analysis: {}, governance: {}, learning: {} };

const d = H.drift([10, 12, 14], [10, 10, 10], { threshold: 0.1 });
assert.equal(d.sampleCount, 3);
assert.equal(d.driftDetected, true);
assert.equal(H.drift([10, 10, 10], [10, 10, 10]).driftDetected, false);

const record = H.outcomeRecord({ decisionId: 'D-001', snapshotHash: 'snap', checkpoint: '6-month', metricId: 'housing-placement', observed: 11, predicted: 10, provenance: { sourceId: 'municipal-source-1', retrievedAt: '2026-09-10T00:00:00Z' } });
assert.equal(record.error, 1);
assert.ok(record.integrityHash);
assert.throws(() => H.outcomeRecord({ decisionId: 'D-001', snapshotHash: 'snap', checkpoint: '6-month', metricId: 'x', observed: 1, predicted: 1 }), /outcome-provenance-required/);

const g = H.governance({ decision });
assert.equal(g.status, 'CLEAR');
assert.equal(g.recommendationAllowed, true);
const blocked = H.governance({ decision, failures: ['stale-evidence'] });
assert.equal(blocked.status, 'BLOCKED');
assert.equal(blocked.recommendationAllowed, false);

assert.deepEqual(H.validateArtifactCompleteness(artifact).missing, []);
assert.deepEqual(H.validateArtifactCompleteness({ decision }).missing.sort(), ['analysis','audit','counterfactual','evidence','governance','learning','parameters']);

const incomplete = H.readiness({ decision, artifact, artifactVerification: { ok: true }, universe: { interventions: [{id:'x'}], complete: false }, governanceResult: g, learning: { checkpoints: H.CHECKPOINTS } });
assert.equal(incomplete.status, 'NOT_READY');
assert.ok(incomplete.failures.includes('intervention-universe-incomplete'));
const ready = H.readiness({ decision, artifact, artifactVerification: { ok: true }, universe: { interventions: [{id:'x'}], complete: true }, governanceResult: g, learning: { checkpoints: H.CHECKPOINTS } });
assert.equal(ready.status, 'READY');
const notReady = H.readiness({ decision, artifact, artifactVerification: { ok: false }, universe: { interventions: [{id:'x'}], complete: true }, governanceResult: blocked, learning: { checkpoints: H.CHECKPOINTS } });
assert.equal(notReady.status, 'NOT_READY');
assert.ok(notReady.failures.includes('artifact-integrity-unverified'));
assert.ok(notReady.failures.includes('governance-blocked'));

console.log('vidik-production-hardening-16: PASS');
