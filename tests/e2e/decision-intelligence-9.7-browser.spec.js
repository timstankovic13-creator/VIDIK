const { test, expect } = require('@playwright/test');

test.describe('VIDIK 9.7 browser decision intelligence', () => {
  test('renders sensitivity, uncertainty and VOI without replacing canonical panels', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForFunction(() => window.VIDIK_DECISION_INTELLIGENCE_9_7_BROWSER && window.VIDIK_DECISION_INTELLIGENCE_9_7_BROWSER.integrityHash, null, { timeout: 15000 });
    await page.locator('#seeAnalysis').click();

    const result = await page.evaluate(() => window.VIDIK_DECISION_INTELLIGENCE_9_7_BROWSER);
    expect(result.version).toBe('9.7.1');
    expect(result.uncertainty.sampleCount).toBe(2000);
    expect(result.uncertainty.seed).toBe(1729);
    expect(result.baselineRecommendation).toBeTruthy();
    expect(result.voi.ranked.some(item => item.id === 'paramedic')).toBe(false);

    const uncertainty = page.locator('#uncertainty');
    const voi = page.locator('#voi');
    const di97Uncertainty = page.locator('[data-vidik-di97][aria-label="VIDIK 9.7.1 decision intelligence"]');
    const di97Voi = page.locator('[data-vidik-di97][aria-label="VIDIK 9.7.1 value of information"]');
    await expect(uncertainty).toContainText('Sensitivity');
    await expect(voi).toContainText('Value of information');
    await expect(di97Uncertainty).toContainText('9.7.1');
    await expect(di97Voi).toContainText('9.7.1');
    await expect(di97Uncertainty).toContainText('Recommendation flips');
    await expect(di97Voi).toContainText('value-of-information ranking');

    const canonicalPanelText = await uncertainty.evaluate(el => el.textContent);
    expect(canonicalPanelText).not.toBe('9.7.1 · 2,000 deterministic samples');
  });
});
