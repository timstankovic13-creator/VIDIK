'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseMoney, detectBudgetIntent } = require('../js/budget-scope');

test('parses explicit money scales', () => {
  assert.equal(parseMoney('$1.4B').amount, 1_400_000_000);
  assert.equal(parseMoney('850 million').amount, 850_000_000);
});

test('recognizes full municipal budget optimization', () => {
  const intent = detectBudgetIntent('I have my full municipal budget of $1.4B. I need to optimize the budget so dollars do not lose value.');
  assert.equal(intent.scope, 'full-budget');
  assert.equal(intent.amount, 1_400_000_000);
  assert.equal(intent.objective, 'preserve-marginal-dollar-value');
});

test('ordinary decision remains single-decision', () => {
  assert.equal(detectBudgetIntent('Reduce violent crime').scope, 'single-decision');
});

test('explicit resource pool becomes portfolio allocation', () => {
  assert.equal(detectBudgetIntent('We have $25M to reduce pedestrian injuries').scope, 'portfolio');
});

test('funded decision with a specific amount remains a single decision', () => {
  const intent = detectBudgetIntent('Should we spend $2M on a new overdose-response program?');
  assert.equal(intent.scope, 'single-decision');
  assert.equal(intent.amount, 2_000_000);
});
