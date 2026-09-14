'use strict';

const { auditHash } = require('./decision-engine');

function clone(x) { return JSON.parse(JSON.stringify(x)); }
function requiredString(x) { return typeof x === 'string' && x.trim().length > 0; }
function validSchedule(schedule) {
  if (!Array.isArray(schedule) || schedule.length === 0) return false;
  const seen = new Set();
  for (const r of schedule) {
    if (!requiredString(r?.at) || !requiredString(r?.purpose)) return false;
    if (seen.has(r.at)) return false;
    seen.add(r.at);
  }
  return true;
}
function validCounterfactual(c = {}) {
  return c.statusQuoExplicit === true && c.recommendationEligible === true && Number.isFinite(Number(c.effect)) && Number(c.effect) !== 0 && Number(c.resource) > 0 && requiredString(c.effectUnit) && requiredString(c.resourceUnit);
}

async function createDecisionArtifact(input = {}) {
  const decision = clone(input);
  if (!requiredString(decision.problem)) throw new Error('artifact-problem-required');
  if (!decision.statusQuo?.explicit) throw new Error('artifact-status-quo-required');
  if (!decision.recommendation?.allowed) throw new Error('artifact-recommendation-must-be-eligible');
  if (!validCounterfactual(decision.counterfactual)) throw new Error('artifact-counterfactual-invalid');
  if (!validSchedule(decision.reviewSchedule)) throw new Error('artifact-review-schedule-invalid');
  if (decision.governance?.effectsImported === true || decision.governance?.comparableCityEffectsImported === true) throw new Error('artifact-imported-effect-forbidden');
  const immutable = {
    schemaVersion: 'vidik.decision-artifact.v1',
    problem: decision.problem,
    statusQuo: clone(decision.statusQuo),
    recommendation: clone(decision.recommendation),
    counterfactual: clone(decision.counterfactual),
    evidence: clone(decision.evidence || []),
    parameters: clone(decision.parameters || []),
    uncertainty: clone(decision.uncertainty || {}),
    opportunityCost: clone(decision.opportunityCost || {}),
    equity: clone(decision.equity || {}),
    implementation: clone(decision.implementation || {}),
    reviewSchedule: clone(decision.reviewSchedule),
    governance: clone(decision.governance || {}),
    createdAt: decision.createdAt || new Date().toISOString()
  };
  immutable.baselineHash = await auditHash(immutable);
  return Object.freeze(immutable);
}

function validateDecisionArtifact(artifact) {
  const failures = [];
  if (artifact?.schemaVersion !== 'vidik.decision-artifact.v1') failures.push('schema-invalid');
  if (!requiredString(artifact?.problem)) failures.push('problem-missing');
  if (!artifact?.statusQuo?.explicit) failures.push('status-quo-missing');
  if (!artifact?.recommendation?.allowed) failures.push('recommendation-ineligible');
  if (!validCounterfactual(artifact?.counterfactual)) failures.push('counterfactual-invalid');
  if (!validSchedule(artifact?.reviewSchedule)) failures.push('review-schedule-invalid');
  if (artifact?.governance?.effectsImported || artifact?.governance?.comparableCityEffectsImported) failures.push('imported-effect');
  if (!requiredString(artifact?.baselineHash)) failures.push('baseline-hash-missing');
  return { valid: failures.length === 0, failures };
}

async function detectTamper(artifact, baselineHash) {
  if (!artifact || !requiredString(baselineHash) || artifact.baselineHash !== baselineHash) return true;
  const copy = clone(artifact);
  delete copy.baselineHash;
  const recomputed = await auditHash(copy);
  return recomputed !== baselineHash;
}

module.exports = { createDecisionArtifact, validateDecisionArtifact, detectTamper, validCounterfactual, validSchedule };
