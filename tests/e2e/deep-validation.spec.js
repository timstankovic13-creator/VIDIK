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
    await expect(page.locator('#rec')).toHaveText('NO RECOMMENDATION');
    await expect(pool).toHaveAttribute('aria-invalid', 'true');
  });

  test('hostile mutation invalidates an already generated decision and prevents stale state', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#gate')).not.toContainText('BLOCKED', { timeout: 5000 });

    const initialRecommendation = await page.locator('#recommendation').textContent();
    const initialAdmissible = await page.locator('#admissible').textContent();
    expect(initialRecommendation?.trim()).not.toBe('NO RECOMMENDATION');
    expect(Number(initialAdmissible?.trim())).toBeGreaterThan(0);

    const pool = page.locator('#pool');
    await pool.evaluate(el => {
      el.value = '-1';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await expect(page.locator('#gate')).toContainText('BLOCKED', { timeout: 3000 });
    await expect(page.locator('#recommendation')).toHaveText('NO RECOMMENDATION');
    await expect(page.locator('#rec')).toHaveText('NO RECOMMENDATION');
    await expect.poll(async () => Number(await page.locator('#admissible').textContent())).toBe(0);
    await expect(pool).toHaveAttribute('aria-invalid', 'true');
    await expect(pool).toHaveJSProperty('validationMessage', 'Resource pool cannot be negative.');
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
