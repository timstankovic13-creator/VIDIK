'use strict';
const { test, expect } = require('@playwright/test');

test('Case 002 fails closed when marginal resource and system-outcome evidence are missing', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => {
    const engine = window.VIDIK_EVIDENCE_CEILING_13;
    const input = {
      decisionBoundary: '2023-12-06',
      candidates: [{ candidateId: 'ASE_EXPANSION_2024' }],
      sources: [
        { recordId: 'S01', provider: 'City of Ottawa', url: 'https://ottawa.ca/en/city-hall/budget-finance-and-corporate-planning/previous-budgets/budget-2023/draft-budget-2023-glance', publishedAt: '2023-01-01' },
        { recordId: 'S02', provider: 'City of Ottawa', url: 'https://ottawa.ca/en/parking-roads-and-travel/road-safety/enforcement/automated-speed-enforcement/site-selection', publishedAt: '2023-01-01' }
      ],
      claims: [
        { claimId: 'C-resource', candidateId: 'ASE_EXPANSION_2024', stage: 'resource', sourceRecordId: 'S01', asOf: '2023-01-01' },
        { claimId: 'C-capacity', candidateId: 'ASE_EXPANSION_2024', stage: 'capacity', sourceRecordId: 'S01', asOf: '2023-01-01' },
        { claimId: 'C-activity', candidateId: 'ASE_EXPANSION_2024', stage: 'activity', sourceRecordId: 'S02', asOf: '2023-01-01' }
      ]
    };
    return engine.evaluate(input);
  });
  expect(result.ok).toBeTruthy();
  expect(result.decision.status).toBe('NO RECOMMENDATION');
  expect(result.decision.blocked).toBeTruthy();
  expect(result.decision.gates.ASE_EXPANSION_2024.missingStages).toEqual(['outcome', 'systemOutcome']);
});

test('Case 002 rejects post-boundary evidence as executable historical input', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(() => window.VIDIK_EVIDENCE_CEILING_13.prepare({
    decisionBoundary: '2023-12-06',
    candidates: [{ candidateId: 'ASE_EXPANSION_2024' }],
    sources: [{ recordId: 'POST', provider: 'City of Ottawa', url: 'https://ottawa.ca/en/parking-roads-and-travel/road-safety/enforcement/automated-speed-enforcement/ase-cameras-data-driven-program', publishedAt: '2024-01-01' }],
    claims: []
  }));
  expect(result.ok).toBeFalsy();
  expect(result.reason).toContain('published after the decision boundary');
});
