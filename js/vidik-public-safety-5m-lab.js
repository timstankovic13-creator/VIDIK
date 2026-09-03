'use strict';

// Synthetic mechanics benchmark only. Never promotes production effects, ROI, or recommendations.
const POOL = 5000000;
const SYNTHETIC_ASSUMPTION = true;

function finiteNonNegative(x) { return Number.isFinite(x) && x >= 0; }
function validateScenario(s) {
  const failures = [];
  if (!s || s.syntheticAssumption !== true) failures.push('synthetic-assumption-required');
  if (!s?.id || !s?.name) failures.push('identity-required');
  if (!Array.isArray(s?.candidates) || !s.candidates.length) failures.push('candidates-required');
  const ids = new Set();
  for (const c of s?.candidates || []) {
    if (!c?.id) failures.push('candidate-id-required');
    else if (ids.has(c.id)) failures.push(`${c.id}:duplicate-candidate-id`);
    else ids.add(c.id);
    if (!finiteNonNegative(c.min) || !finiteNonNegative(c.max) || c.min > c.max) failures.push(`${c.id}:invalid-bounds`);
    if (!finiteNonNegative(c.unitCost) || c.unitCost !== 1) failures.push(`${c.id}:unit-cost-must-equal-one-dollar`);
    if (!Number.isFinite(c.valuePerDollar) || c.valuePerDollar < 0) failures.push(`${c.id}:invalid-value`);
    if (!Number.isFinite(c.risk) || c.risk < 0 || c.risk > 1) failures.push(`${c.id}:invalid-risk`);
  }
  return { pass: failures.length === 0, failures };
}

function allocateFiveMillion(scenario, riskCeiling = 1) {
  const gate = validateScenario(scenario);
  if (!gate.pass) return { blocked: true, reason: gate.failures };
  if (!Number.isFinite(riskCeiling) || riskCeiling < 0 || riskCeiling > 1) return { blocked: true, reason: ['invalid-risk-ceiling'] };
  const allocations = Object.fromEntries(scenario.candidates.map(c => [c.id, 0]));
  let remaining = POOL;
  const eligible = scenario.candidates.filter(c => c.risk <= riskCeiling);
  const ineligibleWithMinimum = scenario.candidates.filter(c => c.risk > riskCeiling && c.min > 0);
  if (ineligibleWithMinimum.length) return { blocked: true, reason: ['minimum-requirement-ineligible'], candidates: ineligibleWithMinimum.map(c => c.id) };
  const requiredMinimum = eligible.reduce((sum, c) => sum + c.min, 0);
  if (requiredMinimum > POOL) return { blocked: true, reason: ['minimum-requirements-exceed-pool'] };
  for (const c of eligible) { allocations[c.id] = c.min; remaining -= c.min; }
  const ranked = [...eligible].sort((a,b) => b.valuePerDollar - a.valuePerDollar || a.id.localeCompare(b.id));
  for (const c of ranked) {
    const spend = Math.min(c.max - allocations[c.id], remaining);
    allocations[c.id] += spend;
    remaining -= spend;
  }
  return { blocked:false, synthetic:true, pool:POOL, riskCeiling, allocations, unallocated:remaining, objectiveValue:eligible.reduce((sum,c) => sum + allocations[c.id] * c.valuePerDollar, 0), productionRecommendation:null, effectEstimate:null, roi:null, status:'LAB_ONLY_NOT_A_REAL_RECOMMENDATION' };
}

function sensitivity(scenario, riskCeiling = 1, deltas = [-0.25,-0.10,0,0.10,0.25]) {
  return deltas.map(delta => ({ delta, rows: scenario.candidates.map((c,i) => ({ candidate:c.id, delta, result:allocateFiveMillion({ ...scenario, candidates:scenario.candidates.map((x,j) => j === i ? { ...x, valuePerDollar:Math.max(0,x.valuePerDollar*(1+delta)) } : { ...x }) },riskCeiling) })) }));
}

module.exports = { POOL, SYNTHETIC_ASSUMPTION, validateScenario, allocateFiveMillion, sensitivity };
