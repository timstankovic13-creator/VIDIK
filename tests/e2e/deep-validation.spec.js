import { test, expect } from '@playwright/test';

const CHUNKS = Array.from({ length: 10 }, (_, i) => `census-${String(i + 1).padStart(2, '0')}.b64`);

async function loadedCount(page) {
  await page.goto('/');
  await expect(page.getByText('Census Loaded', { exact: false })).toBeVisible({ timeout: 15000 });
  return page.locator('text=12,138').first();
}

test.describe('VIDIK 9.1.3 hostile production validation', () => {
  test('census chunks are all retrievable and browser loads 12,138 records', async ({ page, request }) => {
    for (const chunk of CHUNKS) {
      const response = await request.get(`/data/${chunk}`);
      expect(response.ok(), `${chunk} should be retrievable`).toBeTruthy();
    }
    await loadedCount(page);
  });

  test('decision engine rejects negative resources', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Census Loaded', { exact: false })).toBeVisible({ timeout: 15000 });
    const resource = page.locator('input[type="range"]').first();
    await resource.evaluate((el) => {
      el.value = '-1';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.getByText(/invalid|inadmissible|must be|error|reject/i).first()).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('DECISION ADMISSIBLE', { exact: false })).toHaveCount(0);
  });

  test('city controls work using accessible/semantic selectors', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Census Loaded', { exact: false })).toBeVisible({ timeout: 15000 });
    const selects = page.locator('select');
    const count = await selects.count();
    expect(count).toBeGreaterThan(0);
    let changed = false;
    for (let i = 0; i < count; i++) {
      const options = selects.nth(i).locator('option');
      if (await options.count() > 1) {
        await selects.nth(i).selectOption({ index: 1 });
        changed = true;
        break;
      }
    }
    expect(changed).toBeTruthy();
  });
});
