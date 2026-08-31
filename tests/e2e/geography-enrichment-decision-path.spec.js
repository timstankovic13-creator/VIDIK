const { test, expect } = require('@playwright/test');

test.describe('VIDIK geography and population decision path', () => {
  test('selected city carries identity and population lineage into decision state', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.VIDIK_92_INTEGRATION?.status === 'READY');
    const result = await page.evaluate(async () => {
      const city = document.getElementById('city');
      const states = {};
      for (const name of ['Ottawa','Toronto','Melbourne']) {
        city.value = name;
        city.dispatchEvent(new Event('change', { bubbles: true }));
        await window.VIDIK_92_INTEGRATION.recompute();
        states[name] = window.VIDIK_92_INTEGRATION.sourceLineage;
      }
      return states;
    });
    for (const city of ['Ottawa','Toronto','Melbourne']) {
      expect(result[city]).toMatchObject({
        status: 'CONTRACTED', city,
        identityAuthority: 'GeoNames',
        populationEnrichment: 'WorldPop',
        retrievalMode: 'controlled-server-side'
      });
      expect(result[city].sourceUrl).toMatch(/^https:\/\//);
    }
    expect(result.Ottawa.sourceUrl).not.toBe(result.Toronto.sourceUrl);
    expect(result.Toronto.sourceUrl).not.toBe(result.Melbourne.sourceUrl);
  });

  test('city changes recompute decision state instead of only changing the label', async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.VIDIK_92_INTEGRATION?.status === 'READY');
    const result = await page.evaluate(async () => {
      const city = document.getElementById('city');
      const out = {};
      for (const name of ['Ottawa','Toronto','Melbourne']) {
        city.value = name;
        city.dispatchEvent(new Event('change', { bubbles: true }));
        await window.VIDIK_92_INTEGRATION.recompute();
        out[name] = {
          stateCity: window.VIDIK_92_INTEGRATION.decision.city,
          sourceCity: window.VIDIK_92_INTEGRATION.sourceLineage.city,
          sourceUrl: window.VIDIK_92_INTEGRATION.sourceLineage.sourceUrl,
          status: window.VIDIK_92_INTEGRATION.status
        };
      }
      return out;
    });
    for (const city of ['Ottawa','Toronto','Melbourne']) {
      expect(result[city].stateCity).toBe(city);
      expect(result[city].sourceCity).toBe(city);
      expect(result[city].status).toBe('READY');
    }
  });
});
