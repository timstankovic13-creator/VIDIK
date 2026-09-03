'use strict';

const REQUIRED_BY_CASE = {
  '009':['approach/intersection traffic volume','collision severity and site linkage','concurrent intervention history','camera activation/deactivation uptime'],
  '010':['approach/intersection traffic volume','collision severity and site linkage','concurrent intervention history','camera operating status and treatment history'],
  '014':['actual marginal bed availability/allocation by site/date','decision-unit occupancy/admissions','comparable demand periods/sites or capacity shock','exit destination and linked repeat-use outcomes where preregistered'],
  '006':['eligible-call exposure/assignment','comparable eligible calls or areas','repeat-call linkage','downstream emergency-service utilization']
};
function validFieldEvidence(v) {
  return Boolean(v && typeof v==='object' && !Array.isArray(v) && typeof v.source==='string' && v.source.trim() &&
    v.value!==undefined && v.value!==null && v.value!=='' && !(typeof v.value==='string' && !v.value.trim()));
}
function validateEvidenceReturn(request, returned) {
  const failures=[];
  if (!request || !REQUIRED_BY_CASE[request.case]) failures.push('unknown-case');
  if (!returned || typeof returned!=='object' || Array.isArray(returned)) failures.push('returned-evidence-object-required');
  if (failures.length) return {pass:false,failures,promotable:false};
  if (request.temporal_cutoff && returned.temporalCutoff !== request.temporal_cutoff) failures.push('temporal-cutoff-mismatch');
  if (returned.temporalAdmissible!==true) failures.push('temporal-admissibility-required');
  if (returned.provenanceComplete!==true) failures.push('provenance-required');
  if (returned.claimScope && typeof returned.claimScope!=='string') failures.push('claim-scope-invalid');
  for (const field of REQUIRED_BY_CASE[request.case]) if (!validFieldEvidence(returned.fields?.[field])) failures.push(`invalid-material-field:${field}`);
  if (returned.exposureVerified!==true) failures.push('actual-exposure-required');
  if (returned.comparatorDefensible!==true) failures.push('defensible-counterfactual-required');
  if (returned.measurementReady!==true) failures.push('measurement-readiness-required');
  return {pass:failures.length===0,failures,promotable:failures.length===0};
}
module.exports = { REQUIRED_BY_CASE, validateEvidenceReturn };
