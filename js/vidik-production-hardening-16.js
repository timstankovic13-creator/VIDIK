'use strict';

const crypto = require('crypto');
const VERSION = '16.0.0';
const CHECKPOINTS = Object.freeze(['6-month', '1-year', '2-year', '5-year']);
const stable = x => Array.isArray(x) ? '[' + x.map(stable).join(',') + ']' : (x && typeof x === 'object' ? '{' + Object.keys(x).sort().map(k => JSON.stringify(k) + ':' + stable(x[k])).join(',') + '}' : JSON.stringify(x));
const hash = x => crypto.createHash('sha256').update(stable(x)).digest('hex');
const finite = x => Number.isFinite(Number(x));
const clone = x => JSON.parse(JSON.stringify(x));

function drift(observed, predicted, { threshold = 0.2, minPairs = 2 } = {}) {
  if (!Array.isArray(observed) || !Array.isArray(predicted) || observed.length !== predicted.length || observed.length < minPairs) throw new Error('invalid-drift-series');
  const errors = observed.map((x, i) => Number(x) - Number(predicted[i]));
  if (!errors.every(finite)) throw new Error('non-finite-drift-series');
  const mae = errors.reduce((s, x) => s + Math.abs(x), 0) / errors.length;
  const rmse = Math.sqrt(errors.reduce((s, x) => s + x * x, 0) / errors.length);
  const meanObserved = observed.reduce((s, x) => s + Number(x), 0) / observed.length;
  const meanPredicted = predicted.reduce((s, x) => s + Number(x), 0) / predicted.length;
  const meanAbsObserved = Math.max(Math.abs(meanObserved), 1e-12);
  const relativeBias = Math.abs(meanObserved - meanPredicted) / meanAbsObserved;
  return { version: VERSION, sampleCount: errors.length, mae, rmse, relativeBias, threshold: Number(threshold), driftDetected: mae > Number(threshold) || relativeBias > Number(threshold), errors, hash: hash({ errors, threshold }) };
}

function outcomeRecord({ decisionId, snapshotHash, checkpoint, metricId, observed, predicted, provenance, recordedAt }) {
  if (!decisionId || !snapshotHash || !CHECKPOINTS.includes(checkpoint) || !metricId || !finite(observed) || !finite(predicted)) throw new Error('invalid-outcome-record');
  if (!provenance || !provenance.sourceId || !provenance.retrievedAt) throw new Error('outcome-provenance-required');
  return Object.freeze({ schema: 'VIDIK.OutcomeRecord.v16', version: VERSION, decisionId, snapshotHash, checkpoint, metricId, observed: Number(observed), predicted: Number(predicted), error: Number(observed) - Number(predicted), provenance: clone(provenance), recordedAt: recordedAt || null, integrityHash: hash({ decisionId, snapshotHash, checkpoint, metricId, observed: Number(observed), predicted: Number(predicted), provenance }) });
}

function governance({ decision, humanOverride = null, failures = [], killSwitch = false }) {
  const failuresOut = Array.isArray(failures) ? failures.slice() : ['invalid-failure-registry'];
  if (!decision || !decision.identityBrief?.decisionId) failuresOut.push('immutable-decision-id-missing');
  if (!decision?.integrity?.decisionIntegrity) failuresOut.push('decision-integrity-not-established');
  if (!decision?.integrity?.decisionIntelligenceHash) failuresOut.push('decision-intelligence-integrity-missing');
  if (humanOverride && (!humanOverride.actor || !humanOverride.reason || !humanOverride.timestamp)) failuresOut.push('human-override-audit-incomplete');
  const blocked = killSwitch || failuresOut.length > 0;
  return { version: VERSION, status: blocked ? 'BLOCKED' : 'CLEAR', killSwitch: Boolean(killSwitch), failures: failuresOut, humanOverride: humanOverride ? clone(humanOverride) : null, recommendationAllowed: !blocked, hash: hash({ failures: failuresOut, killSwitch, humanOverride }) };
}

function readiness({ decision, artifact, artifactVerification, universe, governanceResult, learning }) {
  const failures = [];
  if (!decision?.identityBrief?.immutableSnapshot) failures.push('decision-snapshot-not-immutable');
  if (!artifact) failures.push('complete-artifact-missing');
  if (artifactVerification?.ok !== true) failures.push('artifact-integrity-unverified');
  if (!universe || !Array.isArray(universe.interventions)) failures.push('intervention-universe-missing');
  if (governanceResult?.recommendationAllowed !== true) failures.push('governance-blocked');
  if (!learning || !Array.isArray(learning.checkpoints) || !CHECKPOINTS.every(x => learning.checkpoints.includes(x))) failures.push('learning-checkpoints-incomplete');
  const status = failures.length ? 'NOT_READY' : 'READY';
  return { version: VERSION, status, failures, recommendationAllowed: status === 'READY', executionReadiness: status === 'READY' ? 'REQUIRES_LOCAL_EXECUTION_APPROVAL' : 'BLOCKED', hash: hash({ status, failures }) };
}

function validateArtifactCompleteness(a) {
  const required = ['decision', 'audit', 'counterfactual', 'evidence', 'parameters', 'analysis', 'governance', 'learning'];
  const missing = required.filter(k => !a || a[k] == null);
  return { complete: missing.length === 0, missing, hash: hash({ missing }) };
}

module.exports = Object.freeze({ VERSION, CHECKPOINTS, hash, drift, outcomeRecord, governance, readiness, validateArtifactCompleteness });
