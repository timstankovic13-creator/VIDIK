'use strict';
const { test } = require('@playwright/test');
const assert = require('assert');
const m = require('../js/evidence-ceiling-13.js');

test('Case 003 fails closed when marginal outcome and system-outcome evidence are missing', () => {
  const result = m.evaluate({
    decisionBoundary: '2023-12-06',
    candidates: [{ candidateId: 'PARAMEDIC_CAPACITY_2024' }],
    sources: [
      { recordId: 'S01', provider: 'City of Ottawa', url: 'https://ottawa.ca/en/city-hall/budget-finance-and-corporate-planning/previous-budgets/budget-2023/draft-budget-2023-glance', publishedAt: '2023-01-01' }
    ],
    claims: [
      { claimId: 'C-resource', candidateId: 'PARAMEDIC_CAPACITY_2024', stage: 'resource', sourceRecordId: 'S01', asOf: '2023-01-01' },
      { claimId: 'C-capacity', candidateId: 'PARAMEDIC_CAPACITY_2024', stage: 'capacity', sourceRecordId: 'S01', asOf: '2023-01-01' },
      { claimId: 'C-activity', candidateId: 'PARAMEDIC_CAPACITY_2024', stage: 'activity', sourceRecordId: 'S01', asOf: '2023-01-01' }
    ]
  });
  assert.equal(result.ok, true);
  assert.equal(result.decision.status, 'NO RECOMMENDATION');
  assert.equal(result.decision.blocked, true);
  assert.deepEqual(result.decision.gates.PARAMEDIC_CAPACITY_2024.missingStages, ['outcome', 'systemOutcome']);
  assert.equal(result.decision.gates.PARAMEDIC_CAPACITY_2024.recommendation, null);
});

test('Case 003 rejects post-boundary evidence as executable historical input', () => {
  const result = m.prepare({
    decisionBoundary: '2023-12-06',
    candidates: [{ candidateId: 'PARAMEDIC_CAPACITY_2024' }],
    sources: [{ recordId: 'POST', provider: 'City of Ottawa', url: 'https://ottawa.ca/en/city-hall/city-news/newsroom', publishedAt: '2024-01-01' }],
    claims: []
  });
  assert.equal(result.ok, false);
  assert(result.reason.includes('published after the decision boundary'));
});
