const { test, expect } = require('@playwright/test');

test('Case 001 real Ottawa supportive-housing chain remains blocked as non-marginal evidence', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.readyState === 'complete');

  const result = await page.evaluate(() => VIDIK_HistoricalParameters.normalizeMarginalMap({
    resourceUnit: 'CAD',
    resourceAmount: 1000000,
    capacityUnit: 'supportive-housing units',
    // Descriptive equivalent only: $1M / $39,390 average annual funding per unit.
    capacityValue: 1000000 / 39390,
    outcomeUnit: 'people retained in housing for 1+ year',
    // Descriptive application of observed 78% retention, not a marginal causal effect.
    outcomeValue: (1000000 / 39390) * 0.78,
    measurementPeriod: 'annual operating funding / 1+ year retention',
    denominator: 'average annual operating funding per supportive-housing unit',
    geography: 'Ottawa',
    population: 'supportive-housing program population',
    uncertainty: 'marginal conversion and causal incremental effect not established',
    mechanism: 'annual operating funding -> supportive housing capacity -> retention',
    sourceIds: ['OTTAWA_2023_HH_PROGRESS_REPORT'],
    claimIds: ['AVG_OPERATING_FUNDING_PER_UNIT_39390', 'RETENTION_1Y_78_PERCENT'],
    causalGate: 'not-passed',
    transportabilityGate: 'not-passed',
    candidateSpecific: false
  }, ['OTTAWA_2023_HH_PROGRESS_REPORT'], [
    'AVG_OPERATING_FUNDING_PER_UNIT_39390',
    'RETENTION_1Y_78_PERCENT'
  ]));

  expect(result.status).toBe('missing');
  expect(result.candidateSpecific).toBe(false);
  expect(result.reason).toContain('causal-identification gate');
});
