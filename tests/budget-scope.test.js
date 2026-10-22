'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseMoney, detectBudgetIntent } = require('../js/budget-scope');

test('parses explicit dollar amounts with scale', () => {
  assert.equal(parseMoney('I have $1.4B').amount, 1.4e9);
  assert.equal(parseMoney('full budget of $850 million').amount, 850e6);
  assert.equal(parseMoney('budget is 25000000').amount, 25e6);
});

test('recognizes a full-budget optimization request from natural language', () => {
  const result = detectBudgetIntent('I have my full municipal budget of $1.4B. I need to optimize the budget so dollars do not lose value.');
  assert.equal(result.requested, true);
  assert.equal(result.scope, 'full-budget');
  assert.equal(result.amount, 1.4e9);
  assert.equal(result.fullBudget, true);
  assert.equal(result.optimizationRequested, true);
  assert.equal(result.objective, 'preserve-marginal-dollar-value');
});

test('keeps ordinary decision language as single-decision scope', () => {
  const result = detectBudgetIntent('Should we add an automated speed camera at this intersection?');
  assert.equal(result.scope, 'single-decision');
  assert.equal(result.amount, null);
  assert.equal(result.requested, false);
});

test('treats an explicit resource amount as a portfolio constraint without requiring budget wording', () => {
  const result = detectBudgetIntent('Reduce pedestrian injuries with $2 million available.');
  assert.equal(result.scope, 'portfolio');
  assert.equal(result.amount, 2e6);
  assert.equal(result.requested, true);
});
