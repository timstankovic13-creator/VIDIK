const { test, expect } = require('@playwright/test');

test.describe('municipal source lineage decision path', () => {
  for (const city of ['Ottawa', 'Toronto', 'Melbourne']) {
    test(`${city} source contract reaches decision state`, async ({ page }) => {
      await page.goto('/');
      await page.selectOption('#city', city);
      await page.waitForFunction(() => window.VIDIK_92_INTEGRATION?.status === 'READY');
      const result = await page.evaluate(() => {
        const s = window.VIDIK_92_INTEGRATION;
        return { decision: s.decision, sourceLineage: s.sourceLineage };
      });
      expect(result.decision.city).toBe(city);
      expect(result.sourceLineage.status).toBe('CONTRACTED');
      expect(result.sourceLineage.identityAuthority).toBe('GeoNames');
      expect(result.sourceLineage.populationEnrichment).toBe('WorldPop');
      expect(result.sourceLineage.sourceUrl).toMatch(/^https:\/\//);
    });
  }
});
