import { test, expect } from '@playwright/test';

const CHUNKS = Array.from({ length: 10 }, (_, i) => `census-${String(i + 1).padStart(2, '0')}.b64`);

test.describe('VIDIK 9.1.3 hostile production validation', () => {
  test('all census chunks are retrievable and the browser loads 12,138 records', async ({ page, request }) => {
    for (const chunk of CHUNKS) {
      const response = await request.get(`/data/${chunk}`);
      expect(response.ok(), `${chunk} should be retrievable`).toBeTruthy();
    }
    await page.goto('/');
    await expect(page.locator('#censusStatus')).toContainText('LOADED', { timeout: 15000 });
    await expect(page.locator('#censusCount')).toHaveText('12,138');
  });

  test('negative resource input is rejected and cannot produce an admissible decision', async ({ page }) => {
    await page.goto('/');
    const pool = page.locator('#pool');
    await pool.evaluate(el => {
      el.value = '-1';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('#gate')).toContainText('BLOCKED', { timeout: 3000 });
    await expect(page.locator('#recommendation')).toHaveText('NO RECOMMENDATION');
  });

  test('city controls are discoverable through semantic selectors', async ({ page }) => {
    await page.goto('/');
    const city = page.locator('#city');
    await expect(city).toBeAttached();
    await expect(city).toBeEnabled();
    const before = await city.inputValue();
    const options = await city.locator('option').allTextContents();
    expect(options.length).toBeGreaterThan(1);
    const next = options.find(v => v !== before);
    await city.selectOption({ label: next });
    expect(await city.inputValue()).toBe(next);
  });
});
