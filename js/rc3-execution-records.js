'use strict';

const { evaluateExecutionReadiness } = require('./rc3-execution-readiness');

const CASES = Object.freeze(['003', '011', '012']);
const CHECKPOINTS = Object.freeze(['6mo', '1yr', '2yr', '5yr']);

function assertCaseId(caseId) {
  if (!CASES.includes(caseId)) throw new Error(`Unsupported execution case: ${caseId}`);
}

function createExecutionRecord({ caseId, decisionId, originalDecisionHash, gates, allocation = null, exposure = null, evidence = [], counterfactual = null, measurement = null }) {
  assertCaseId(caseId);
  if (!decisionId || !originalDecisionHash) throw new Error('decisionId and originalDecisionHash are required');
  const readiness = evaluateExecutionReadiness(gates);
  const record = {
    schema: 'RC3_EXECUTION_RECORD_1.0',
    caseId,
    decisionId,
    originalDecisionHash,
    readiness,
    recommendationStatus: readiness.ready ? 'ELIGIBLE_FOR_EFFECT_ESTIMATION' : 'NO_RECOMMENDATION',
    allocation,
    exposure,
    evidence,
    counterfactual,
    measurement,
    learning: CHECKPOINTS.map(checkpoint => ({ checkpoint, status: 'PENDING', predicted: null, observed: null, conclusion: null })),
    historicalDecisionMutation: false
  };
  return Object.freeze(record);
}

function recordAllocation(record, allocation) {
  if (!allocation || allocation.authorized !== true) throw new Error('authorized allocation required');
  return Object.freeze({ ...record, allocation: Object.freeze({ ...allocation }) });
}

function recordExposure(record, exposure) {
  if (!exposure || exposure.recorded !== true) throw new Error('recorded actual exposure required');
  return Object.freeze({ ...record, exposure: Object.freeze({ ...exposure }) });
}

function updateLearning(record, checkpoint, update) {
  if (!CHECKPOINTS.includes(checkpoint)) throw new Error(`Invalid learning checkpoint: ${checkpoint}`);
  const learning = record.learning.map(item => item.checkpoint === checkpoint ? Object.freeze({ ...item, ...update }) : item);
  return Object.freeze({ ...record, learning: Object.freeze(learning) });
}

module.exports = { CASES, CHECKPOINTS, createExecutionRecord, recordAllocation, recordExposure, updateLearning };
