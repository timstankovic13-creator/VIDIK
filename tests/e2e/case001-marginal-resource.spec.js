const { test, expect } = require('@playwright/test');

test('Case 001 marginal-resource layer rejects unsupported mapping and accepts only a fully evidenced candidate-specific mapping', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.readyState === 'complete');
  const result = await page.evaluate(() => {
    const blocked = VIDIK_HistoricalParameters.normalizeMarginalMap({
      resourceUnit: 'CAD', resourceAmount: 1000000,
      capacityUnit: 'additional placements', capacityValue: null,
      outcomeUnit: 'additional stable-housing participant-years', outcomeValue: null,
      measurementPeriod: '12 months', denominator: 'not established', geography: 'Ottawa',
      population: 'Housing First eligible population', uncertainty: 'not established',
      mechanism: 'CAD to placements to stable housing', causalGate: 'not-passed',
      transportabilityGate: 'not-passed', candidateSpecific: false
    }, ['S3'], ['S3-C1']);
    const defensible = VIDIK_HistoricalParameters.normalizeMarginalMap({
      resourceUnit: 'CAD', resourceAmount: 1000000,
      capacityUnit: 'additional placements', capacityValue: 25,
      outcomeUnit: 'additional stable-housing participant-years', outcomeValue: 18.2,
      measurementPeriod: '12 months', denominator: '25 marginal placements', geography: 'Ottawa',
      population: 'historically eligible Housing First population', uncertainty: '95% interval propagated from source estimates',
      mechanism: 'marginal CAD -> placement capacity -> stable-housing participant-years',
      causalGate: 'passed', transportabilityGate: 'passed', candidateSpecific: true
    }, ['S3'], ['S3-C1']);
    return { blocked, defensible };
  });
  expect(result.blocked.status).toBe('missing');
  expect(result.blocked.reason).toContain('causal-identification gate');
  expect(result.defensible.status).toBe('derived');
  expect(result.defensible.candidateSpecific).toBe(true);
  expect(result.defensible.resourceUnit).toBe('CAD');
  expect(result.defensible.capacityValue).toBe(25);
  expect(result.defensible.outcomeValue).toBe(18.2);
});

test('Case 001 marginal-resource layer refuses post-boundary evidence', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.readyState === 'complete');
  const result = await page.evaluate(() => VIDIK_HistoricalParameters.reconstruct({
    boundary: '2023-12-06',
    sources: { future: {
      id: 'future', publishedAt: '2024-01-15', publicationDateVerified: true, admissibleAtBoundary: false,
      claims: [{ id: 'future-C1', type: 'marginal', text: 'future marginal mapping' }]
    }},
    candidateId: 'housing', claimRules: [],
    marginalMap: {
      resourceUnit: 'CAD', resourceAmount: 1000000, capacityUnit: 'placements', capacityValue: 25,
      outcomeUnit: 'participant-years', outcomeValue: 18, measurementPeriod: '12 months',
      denominator: '25 placements', geography: 'Ottawa', population: 'Housing First', uncertainty: 'unknown',
      mechanism: 'CAD -> capacity -> outcome', sourceIds: ['future'], causalGate: 'passed',
      transportabilityGate: 'passed', candidateSpecific: true
    }
  }).marginalization);
  expect(result.status).toBe('missing');
  expect(result.sourceIds).toEqual([]);
});
