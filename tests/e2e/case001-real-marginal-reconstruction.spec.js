const { test, expect } = require('@playwright/test');

test('Case 001 real Ottawa evidence does not manufacture a marginal chain', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.readyState === 'complete');

  const result = await page.evaluate(() => VIDIK_HistoricalParameters.normalizeMarginalMap({
    // Real pre-boundary project observation: Shepherds of Good Hope,
    // 48 supportive units within a $7.8M multi-year investment.
    // The arithmetic ratio is intentionally supplied only as an observed
    // project ratio, not as a claimed marginal production function.
    resourceUnit: 'CAD',
    resourceAmount: 1000000,
    capacityUnit: 'additional supportive-housing units',
    capacityValue: 7.8 / 48,
    outcomeUnit: 'additional stable-housing participant-years',
    outcomeValue: null,
    measurementPeriod: 'project / 12-month outcome horizon not established',
    denominator: '48 listed project units',
    geography: 'Ottawa',
    population: 'supportive-housing project population',
    uncertainty: 'marginal conversion and outcome bridge not established',
    mechanism: 'project capital -> units -> housing outcome -> serious-harm impact',
    sourceIds: ['OTTAWA_DRAFT_BUDGET_2023', 'AT_HOME_CHEZ_SOI_RCT'],
    claimIds: ['SHOG_48_UNITS_7_8M', 'AHCS_STABLE_HOUSING_EFFECT'],
    causalGate: 'not-passed',
    transportabilityGate: 'not-passed',
    candidateSpecific: false
  }, ['OTTAWA_DRAFT_BUDGET_2023', 'AT_HOME_CHEZ_SOI_RCT'], [
    'SHOG_48_UNITS_7_8M',
    'AHCS_STABLE_HOUSING_EFFECT'
  ]));

  return result;
  });

  expect(result.status).toBe('missing');
  expect(result.candidateSpecific).toBe(false);
  expect(result.reason).toContain('causal-identification gate');
});
