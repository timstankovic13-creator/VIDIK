'use strict';

// Contract-level gate. It does not transport causal effects automatically.
function assessTransportability({ sourceCity, targetCity, mappingsValid, parametersReestablished, provenanceValid }) {
  const failures = [];
  if (!sourceCity || !targetCity) failures.push('cities-required');
  if (sourceCity === targetCity) failures.push('source-and-target-must-differ');
  if (mappingsValid !== true) failures.push('independent-mappings-required');
  if (parametersReestablished !== true) failures.push('parameters-must-be-reestablished');
  if (provenanceValid !== true) failures.push('provenance-required');
  return { pass: failures.length === 0, failures, effectTransported: false };
}

module.exports = { assessTransportability };
