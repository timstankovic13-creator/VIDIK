'use strict';

/**
 * VIDIK Public Safety Decision Lab v1.
 *
 * This module is deliberately synthetic. It is a decision-engine benchmark,
 * not a real-world municipal recommendation. Every scenario carries an
 * explicit syntheticAssumption flag and must never be promoted to production
 * effect/ROI/recommendation state.
 */

const SYNTHETIC_ASSUMPTION = true;
const POOL = 5000000;

function finiteNonNegative(x) {
  return Number.isFinite(x) && x >= 0;
}

function validateScenario(s) {
  const failures = [];
  if (!s || s.syntheticAssumption !== true) failures.push('synthetic-assumption-required');
  if (!s.id || !s.name) failures.push('identity-required');
  if (!Array.isArray(s.candidates) || !s.candidates.length) failures.push('candidates-required');
  for (const c of s.candidates || []) {
    if (!finiteNonNegative(c.min) || !finiteNonNegative(c.max) || c.min > c.max) failures.push(`${c.id}:invalid-bounds`);
    if (!finiteNonNegative(c.unitCost) || c.unitCost === 0) failures.push(`${c.id}:invalid-unit-cost`);
    if (!Number.isFinite(c.valuePerDollar) || c.valuePerDollar < 0) failures.push(`${c.id}:invalid-value`);
    if (!Number.isFinite(c.risk) || c.risk < 0 || c.risk > 1) failures.push(`${c.id}:invalid-risk`);
  }
  return { pass: failures.length === 0, failures };
}

function allocateFiveMillion(scenario, riskCeiling = 1) {
  const gate = validateScenario(scenario);
  if (!gate.pass) return { blocked: true, reason: gate.failures };
  if (!Number.isFinite(riskCeiling) || riskCeiling < 0 || riskCeiling > 1) return { blocked: true, reason: ['invalid-risk-ceiling'] };
  const eligible = scenario.candidates
    .filter(c => c.risk <= riskCeiling)
    .sort((a, b) => b.valuePerDollar - a.valuePerDollar);
  const allocations = Object.fromEntries(scenario.candidates.map(c => [c.id, 0]));
  let remaining = POOL;
  for (const c of eligible) {
    const spend = Math.min(c.max, remaining);
    allocations[c.id] = spend;
    remaining -= spend;
  }
  return {
    blocked: false,
    synthetic: SYNTHETIC_ASSUMPTION,
    pool: POOL,
    riskCeiling,
    allocations,
    unallocated: remaining,
    objectiveValue: eligible.reduce((sum, c) => sum + allocations[c.id] * c.valuePerDollar, 0),
    productionRecommendation: null,
    effectEstimate: null,
    roi: null,
    status: 'LAB_ONLY_NOT_A_REAL_RECOMMENDATION'
  };
}

function sensitivity(scenario, riskCeiling = 1, deltas = [-0.25, -0.1, 0, 0.1, 0.25]) {
  return deltas.map(delta => {
    const adjusted = {
      ...scenario,
      candidates: scenario.candidates.map(c => ({ ...c, valuePerDollar: Math.max(0, c.valuePerDollar * (1 + delta)) }))
    };
    return { delta, result: allocateFiveMillion(adjusted, riskCeiling) };
  });
}

module.exports = { POOL, SYNTHETIC_ASSUMPTION, validateScenario, allocateFiveMillion, sensitivity };
