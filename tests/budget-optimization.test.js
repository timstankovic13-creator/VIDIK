'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { optimizeResourceAllocation, buildAllocationDecision } = require('../js/budget-optimization');
const { detectBudgetIntent } = require('../js/budget-scope');

test('allocates a validated pool and conserves every dollar', () => {
  const result = optimizeResourceAllocation({
    amount: 100,
    rows: [
      { id: 'a', name: 'A', min: 0, max: 80, unitValue: 2 },
      { id: 'b', name: 'B', min: 0, max: 80, unitValue: 1 }
    ]
  });
  assert.equal(result.blocked, false);
  assert.equal(result.totalAllocated, 100);
  assert.equal(result.conserved, true);
  assert.equal(result.allocations.a, 80);
  assert.equal(result.allocations.b, 20);
});

test('never invents an allocation value', () => {
  const result = optimizeResourceAllocation({
    amount: 100,
    rows: [{ id: 'unknown', name: 'Unknown', min: 0, max: 100, unitValue: NaN }]
  });
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'invalid-or-unverified-allocation-row');
});

test('protects committed budget and optimizes only discretionary dollars', () => {
  const intent = detectBudgetIntent('I have my full municipal budget of $1.4B. I need to optimize the budget so dollars do not lose value.');
  const result = buildAllocationDecision({
    budgetIntent: intent,
    committedAmount: 1_000_000_000,
    rows: [{ id: 'program', name: 'Validated program', min: 0, max: 400_000_000, unitValue: 0.8 }]
  });
  assert.equal(result.status, 'allocation-ready');
  assert.equal(result.budget.discretionaryAmount, 400_000_000);
  assert.equal(result.optimizer.totalAllocated, 400_000_000);
});

test('full-budget request blocks when validated allocation inputs are missing', () => {
  const intent = detectBudgetIntent('full municipal budget $1.4B optimize spending');
  const result = buildAllocationDecision({ budgetIntent: intent, rows: [] });
  assert.equal(result.status, 'blocked');
  assert.equal(result.reason, 'no-allocation-ready-options');
});
