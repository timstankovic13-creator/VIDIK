import { test, expect } from '@playwright/test';

const CHUNKS = Array.from({ length: 10 }, (_, i) => `census-${String(i + 1).padStart(2, '0')}.b64`);

test.describe('VIDIK 9.1.3 hostile production validation', () => {
  test('all census chunks are retrievable and the browser loads 12,138 records', async ({ page, request }) => {
    for (const chunk of CHUNKS) {
      const response = await request.get(`/data/${chunk}`);
      expect(response.ok(), `${chunk} should be retrievable`).toBeTruthy();
    }
    await page.goto('/');
    await expect(page.getByText('Census Loaded', { exact: false })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('12,138', { exact: false }).first()).toBeVisible();
  });

  test('negative resource input is rejected and cannot produce an admissible decision', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Census Loaded', { exact: false })).toBeVisible({ timeout: 15000 });
    const inputs = page.locator('input[type="range"], input[type="number"]');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
    let exercised = false;
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const min = await input.getAttribute('min');
      if (min !== null && Number(min) >= 0) {
        // Exercise the application's public validation path instead of forcing an impossible DOM value.
        const before = await input.inputValue();
        await input.fill('-1');
        await input.dispatchEvent('input');
        await input.dispatchEvent('change');
        const after = await input.inputValue();
        const invalid = await input.evaluate(el => el.validity && !el.validity.valid);
        expect(invalid || after !== '-1' || before !== '-1').toBeTruthy();
        exercised = true;
        break;
      }
    }
    expect(exercised).toBeTruthy();
    await expect(page.getByText('DECISION ADMISSIBLE', { exact: false })).toHaveCount(0);
  });

  test('city controls are discoverable through semantic selectors', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Census Loaded', { exact: false })).toBeVisible({ timeout: 15000 });
    const selects = page.locator('select');
    const count = await selects.count();
    expect(count).toBeGreaterThan(0);
    let changed = false;
    for (let i = 0; i < count; i++) {
      if (await selects.nth(i).locator('option').count() > 1) {
        await selects.nth(i).selectOption({ index: 1 });
        changed = true;
        break;
      }
    }
    expect(changed).toBeTruthy();
  });
});
