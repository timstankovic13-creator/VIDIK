'use strict';

function finiteNonNegative(value) {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
}

function normalizeRows(rows) {
  return (Array.isArray(rows) ? rows : []).map(row => ({
    id: String(row.id || '').trim(),
    name: String(row.name || row.id || '').trim(),
    min: Number(row.min ?? 0),
    max: Number(row.max ?? Infinity),
    unitValue: Number(row.unitValue),
    fixed: Boolean(row.fixed),
    department: row.department ? String(row.department) : null
  }));
}

/*
 * Allocation is deliberately evidence-bound. A candidate is allocatable only
 * when a validated marginal value per dollar and explicit resource bounds exist.
 * Unknown cost/effect is never treated as zero.
 */
function optimizeResourceAllocation({ amount, rows, maxShare = 1 } = {}) {
  if (!finiteNonNegative(amount)) return { blocked: true, reason: 'invalid-resource-pool' };
  if (!Array.isArray(rows) || !rows.length) return { blocked: true, reason: 'no-allocation-ready-options' };
  if (!Number.isFinite(maxShare) || maxShare <= 0 || maxShare > 1) return { blocked: true, reason: 'invalid-max-share' };

  const normalized = normalizeRows(rows);
  const ids = new Set();
  for (const row of normalized) {
    if (!row.id || ids.has(row.id) || !finiteNonNegative(row.min) || !finiteNonNegative(row.max) ||
        row.max < row.min || !finiteNonNegative(row.unitValue) || row.unitValue <= 0) {
      return { blocked: true, reason: 'invalid-or-unverified-allocation-row' };
    }
    ids.add(row.id);
  }

  const cap = amount * maxShare;
  const bounded = normalized.map(row => ({ ...row, max: Math.min(row.max, cap) }));
  const minimum = bounded.reduce((sum, row) => sum + row.min, 0);
  if (minimum > amount + 1e-9) return { blocked: true, reason: 'infeasible-minimum' };

  const allocations = Object.fromEntries(bounded.map(row => [row.id, row.min]));
  let remaining = amount - minimum;

  for (const row of [...bounded].sort((a, b) => b.unitValue - a.unitValue)) {
    if (remaining <= 1e-9) break;
    const add = Math.min(remaining, Math.max(0, row.max - allocations[row.id]));
    allocations[row.id] += add;
    remaining -= add;
  }

  if (remaining > 1e-6) return { blocked: true, reason: 'insufficient-validated-capacity' };

  const totalAllocated = Object.values(allocations).reduce((sum, value) => sum + value, 0);
  return {
    blocked: false,
    objective: 'maximize-supported-marginal-value-per-dollar',
    allocations,
    totalAllocated,
    unallocated: Math.max(0, amount - totalAllocated),
    conserved: Math.abs(totalAllocated - amount) <= 1e-6,
    constraints: {
      maxShare,
      minimumsSatisfied: bounded.every(row => allocations[row.id] >= row.min - 1e-9),
      withinValidatedCaps: bounded.every(row => allocations[row.id] <= row.max + 1e-9)
    },
    rows: bounded.map(row => ({ id: row.id, name: row.name, department: row.department, unitValue: row.unitValue }))
  };
}

function buildAllocationDecision({ budgetIntent, rows = [], committedAmount = 0, constraints = {} } = {}) {
  if (!budgetIntent?.requested) return { requested: false, status: 'not-requested' };
  const amount = Number(budgetIntent.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return { requested: true, status: 'blocked', reason: 'explicit-resource-amount-required' };
  }
  const committed = Number(committedAmount || 0);
  if (!finiteNonNegative(committed) || committed > amount) {
    return { requested: true, status: 'blocked', reason: 'invalid-committed-resource-amount' };
  }
  const discretionary = amount - committed;
  const result = optimizeResourceAllocation({
    amount: discretionary,
    rows,
    maxShare: Number(constraints.maxShare ?? 1)
  });
  return {
    requested: true,
    scope: budgetIntent.scope,
    budget: { amount, currency: budgetIntent.currency || null, committedAmount: committed, discretionaryAmount: discretionary },
    status: result.blocked ? 'blocked' : 'allocation-ready',
    reason: result.reason || null,
    objective: budgetIntent.objective || 'optimize-resource-allocation',
    optimizer: result
  };
}

if (typeof module !== 'undefined') module.exports = { optimizeResourceAllocation, buildAllocationDecision, normalizeRows };
