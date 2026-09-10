const { test, expect } = require('@playwright/test');

test.describe('VIDIK 9.7 browser decision intelligence', () => {
  test('renders sensitivity, uncertainty and VOI without replacing canonical panels', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForFunction(() => window.VIDIK_DECISION_INTELLIGENCE_9_7_BROWSER && window.VIDIK_DECISION_INTELLIGENCE_9_7_BROWSER.integrityHash, null, { timeout: 15000 });

    const result = await page.evaluate(() => window.VIDIK_DECISION_INTELLIGENCE_9_7_BROWSER);
    expect(result.version).toBe('9.7.1');
    expect(result.uncertainty.sampleCount).toBe(2000);
    expect(result.uncertainty.seed).toBe(1729);
    expect(result.baselineRecommendation).toBeTruthy();
    expect(result.voi.ranked.some(item => item.id === 'paramedic')).toBe(false);

    const uncertainty = page.locator('#uncertainty');
    const voi = page.locator('#voi');
    await expect(uncertainty).toContainText('9.7.1');
    await expect(voi).toContainText('9.7.1');
    await expect(uncertainty).toContainText('Recommendation flips');
    await expect(voi).toContainText('value-of-information ranking');

    const canonicalPanelText = await page.locator('#uncertainty').evaluate(el => el.textContent);
    expect(canonicalPanelText).not.toBe('9.7.1 · 2,000 deterministic samples');
  });
});
