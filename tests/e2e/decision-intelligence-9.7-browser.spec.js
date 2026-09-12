const { test, expect } = require('@playwright/test');

test.describe('VIDIK 9.7 browser decision intelligence', () => {
  test('presents canonical Step 5 state without replacing canonical panels', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForFunction(() => window.VIDIK_DECISION_INTELLIGENCE_9_7_BROWSER && window.VIDIK_DECISION_INTELLIGENCE_9_7_BROWSER.integrityHash, null, { timeout: 15000 });
    await page.locator('#seeAnalysis').click();
    const result = await page.evaluate(() => window.VIDIK_DECISION_INTELLIGENCE_9_7_BROWSER);
    expect(result.version).toBe('9.7.1');
    expect(result.source).toBe('VIDIK_92_INTEGRATION');
    expect(result.integrityHash).toMatch(/^[0-9a-f]+$/);
    expect(result.decision).toBeTruthy();
    expect(Object.prototype.hasOwnProperty.call(result, 'sensitivity')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(result, 'voi')).toBe(true);
    const uncertainty = page.locator('#uncertainty');
    const voi = page.locator('#voi');
    const di97State = page.locator('[data-vidik-di97][aria-label="VIDIK 9.7.1 canonical decision intelligence"]');
    const di97Voi = page.locator('[data-vidik-di97][aria-label="VIDIK 9.7.1 canonical value-of-information"]');
    await expect(uncertainty).toContainText('Sensitivity');
    await expect(voi.locator('..')).toContainText('Value of information');
    await expect(di97State).toContainText('canonical Step 5 state');
    await expect(di97Voi).toContainText('canonical value-of-information state');
    const renderedState = await di97State.textContent();
    expect(renderedState).toContain(result.source);
    const canonicalPanelText = await uncertainty.evaluate(el => el.textContent);
    expect(canonicalPanelText).not.toBe('9.7.1 · canonical Step 5 state');
  });
});
