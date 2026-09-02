'use strict';

const { CASES } = require('./rc4-evidence-acquisition-spec');

function assessRequest(caseId, proposedFields = []) {
  const spec = CASES[caseId];
  if (!spec) throw new Error(`Unknown RC4 acquisition case: ${caseId}`);
  const proposed = [...new Set(proposedFields)];
  const missing = spec.required.filter(field => !proposed.includes(field));
  const unnecessary = proposed.filter(field => !spec.required.includes(field));
  return Object.freeze({
    caseId,
    requestable: missing.length === 0 && unnecessary.length === 0,
    status: missing.length === 0 && unnecessary.length === 0 ? 'SPEC_COMPLETE' : 'SPEC_INCOMPLETE',
    missing: Object.freeze(missing),
    unnecessary: Object.freeze(unnecessary),
    unit: spec.unit,
    target: spec.target
  });
}

function requestGate(caseId, proposedFields = []) {
  const assessment = assessRequest(caseId, proposedFields);
  return Object.freeze({
    ...assessment,
    sendRequest: assessment.requestable,
    reason: assessment.requestable
      ? 'Proposed package exactly matches the frozen minimum causal package.'
      : 'Do not send: package is incomplete or contains non-MSE fields.'
  });
}

module.exports = { assessRequest, requestGate };
