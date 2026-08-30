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
    await pool.evaluate(el => { el.value = '-1'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
    await expect(page.locator('#gate')).toContainText('BLOCKED', { timeout: 3000 });
    await expect(page.locator('#recommendation')).toHaveText('NO RECOMMENDATION');
    await expect(page.locator('#rec')).toHaveText('NO RECOMMENDATION');
    await expect(pool).toHaveAttribute('aria-invalid', 'true');
  });

  test('hostile mutation invalidates an already generated decision and prevents stale state', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#gate')).not.toContainText('BLOCKED', { timeout: 5000 });
    expect((await page.locator('#recommendation').textContent())?.trim()).not.toBe('NO RECOMMENDATION');
    expect(Number((await page.locator('#admissible').textContent())?.trim())).toBeGreaterThan(0);
    const pool = page.locator('#pool');
    await pool.evaluate(el => { el.value = '-1'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
    await expect(page.locator('#gate')).toContainText('BLOCKED', { timeout: 3000 });
    await expect(page.locator('#recommendation')).toHaveText('NO RECOMMENDATION');
    await expect(page.locator('#rec')).toHaveText('NO RECOMMENDATION');
    await expect.poll(async () => Number(await page.locator('#admissible').textContent())).toBe(0);
    await expect(pool).toHaveAttribute('aria-invalid', 'true');
    await expect(pool).toHaveJSProperty('validationMessage', 'Resource pool cannot be negative.');
  });

  test('hostile risk mutation invalidates an already generated decision', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#gate')).not.toContainText('BLOCKED', { timeout: 5000 });
    expect(Number(await page.locator('#admissible').textContent())).toBeGreaterThan(0);
    const risk = page.locator('#risk');
    await risk.evaluate(el => { el.value = '2'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
    await expect(page.locator('#gate')).toContainText('BLOCKED', { timeout: 3000 });
    await expect(page.locator('#recommendation')).toHaveText('NO RECOMMENDATION');
    await expect(page.locator('#rec')).toHaveText('NO RECOMMENDATION');
    await expect(page.locator('#admissible')).toHaveText('0');
    await expect(risk).toHaveAttribute('aria-invalid', 'true');
    await expect(risk).toHaveJSProperty('validationMessage', 'Risk ceiling must be between 0 and 1.');
  });

  test('hostile non-numeric resource mutation invalidates an already generated decision', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#gate')).not.toContainText('BLOCKED', { timeout: 5000 });
    expect(Number(await page.locator('#admissible').textContent())).toBeGreaterThan(0);
    const pool = page.locator('#pool');
    await pool.evaluate(el => { el.value = 'not-a-number'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
    await expect(page.locator('#gate')).toContainText('BLOCKED', { timeout: 3000 });
    await expect(page.locator('#recommendation')).toHaveText('NO RECOMMENDATION');
    await expect(page.locator('#rec')).toHaveText('NO RECOMMENDATION');
    await expect(page.locator('#admissible')).toHaveText('0');
    await expect(pool).toHaveAttribute('aria-invalid', 'true');
  });

  test('city mutation updates the decision identity and audit state', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#gate')).not.toContainText('BLOCKED', { timeout: 5000 });
    const city = page.locator('#city');
    const beforeCity = await city.inputValue();
    const beforeId = await page.locator('#did').textContent();
    const options = await city.locator('option').evaluateAll(opts => opts.map(o => o.value || o.textContent || ''));
    const target = options.find(v => v !== beforeCity);
    expect(target).toBeTruthy();
    await city.selectOption({ label: target });
    await expect.poll(async () => page.locator('#did').textContent()).not.toBe(beforeId);
    await expect(page.locator('#audit')).toContainText(target);
    await expect(page.locator('#gate')).not.toContainText('BLOCKED');
  });

  test('priority mutation is not falsely exposed when no priority control exists', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#gate')).not.toContainText('BLOCKED', { timeout: 5000 });
    await expect(page.locator('input,select,button')).not.toHaveCount(0);
    const priorityControls = page.locator('#priority, [data-priority], input[name="priority"], select[name="priority"]');
    expect(await priorityControls.count()).toBe(0);
  });

  test('corrupted census chunk fails closed without substitute data', async ({ page }) => {
    await page.route('**/data/census-01.b64', route => route.fulfill({ status: 200, contentType: 'text/plain', body: 'corrupt-census-payload' }));
    await page.goto('/');
    await expect(page.locator('#censusStatus')).toContainText('BLOCKED — census unavailable', { timeout: 15000 });
    await expect(page.locator('#censusCount')).toHaveText('—');
    await expect(page.locator('#readinessResults')).toContainText('No substitute data is used.');
  });

  test('same inputs produce a reproducible decision identity and recommendation', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#gate')).not.toContainText('BLOCKED', { timeout: 5000 });
    const first = { id: await page.locator('#did').textContent(), rec: await page.locator('#recommendation').textContent(), admissible: await page.locator('#admissible').textContent() };
    await page.reload();
    await expect(page.locator('#gate')).not.toContainText('BLOCKED', { timeout: 5000 });
    expect(await page.locator('#did').textContent()).toBe(first.id);
    expect(await page.locator('#recommendation').textContent()).toBe(first.rec);
    expect(await page.locator('#admissible').textContent()).toBe(first.admissible);
  });

  test('city control remains constrained to the canonical supported cities', async ({ page }) => {
    await page.goto('/');
    const values = await page.locator('#city option').evaluateAll(opts => opts.map(o => (o.value || o.textContent || '').trim()));
    expect(values.sort()).toEqual(['Melbourne', 'Ottawa', 'Toronto'].sort());
  });
});
