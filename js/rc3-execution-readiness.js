'use strict';

const REQUIRED_GATES = Object.freeze([
  'contractComplete',
  'authorizedAllocation',
  'actualExposure',
  'admissibleEvidence',
  'defensibleCounterfactual',
  'measurementReady'
]);

const BLOCKERS = Object.freeze({
  contractComplete: 'experiment-contract-incomplete',
  authorizedAllocation: 'authorized-allocation-missing',
  actualExposure: 'actual-exposure-missing',
  admissibleEvidence: 'admissible-evidence-missing',
  defensibleCounterfactual: 'defensible-counterfactual-missing',
  measurementReady: 'measurement-not-ready'
});

function assertBooleanGate(name, value) {
  if (!REQUIRED_GATES.includes(name)) throw new RangeError(`unknown readiness gate: ${name}`);
  if (typeof value !== 'boolean') throw new TypeError(`${name} must be boolean`);
}

function evaluateExecutionReadiness(gates = {}) {
  for (const name of REQUIRED_GATES) assertBooleanGate(name, gates[name]);
  const blockers = REQUIRED_GATES.filter(name => !gates[name]).map(name => BLOCKERS[name]);
  const ready = blockers.length === 0;
  return Object.freeze({
    ready,
    status: ready ? 'READY_FOR_EFFECT_ESTIMATION' : 'BLOCKED',
    blockers: Object.freeze(blockers)
  });
}

function buildExecutionRecord({ caseId, decisionId, originalDecisionHash, contract, gates, allocation = null, exposure = null, evidence = [], counterfactual = null, measurement = null } = {}) {
  if (!caseId || !decisionId || !originalDecisionHash) throw new TypeError('caseId, decisionId and originalDecisionHash are required');
  const readiness = evaluateExecutionReadiness(gates);
  const record = {
    caseId,
    decisionId,
    originalDecisionHash,
    contract: contract || null,
    gates: Object.freeze({ ...gates }),
    readiness,
    allocation,
    exposure,
    evidence: Object.freeze([...evidence]),
    counterfactual,
    measurement,
    recommendationStatus: readiness.ready ? 'ELIGIBLE_FOR_EFFECT_ESTIMATION' : 'NO_RECOMMENDATION',
    historicalDecisionMutation: false
  };
  return Object.freeze(record);
}

module.exports = { REQUIRED_GATES, BLOCKERS, evaluateExecutionReadiness, buildExecutionRecord };
