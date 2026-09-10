const { test, expect } = require('@playwright/test');

const file = '/VIDIK__HTML_REFERENCE_V9_1_2_CANONICAL.html';

async function waitForCensus(page) {
  await expect(page.locator('#censusStatus')).not.toHaveText('Loading…', { timeout: 15000 });
}

test.describe('VIDIK 9.1.2 runtime verification', () => {
  test('loads without uncaught JavaScript errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(file, { waitUntil: 'domcontentloaded' });
    await waitForCensus(page);
    expect(errors).toEqual([]);
  });

  test('initializes the 12,138-city registry', async ({ page }) => {
    await page.goto(file, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#censusCount')).toHaveText('12,138', { timeout: 15000 });
    await expect(page.locator('#censusStatus')).toContainText('LOADED');
  });

  for (const city of ['Ottawa', 'Toronto', 'Melbourne']) {
    test(`searches ${city} and renders PRS ARS OPS`, async ({ page }) => {
      await page.goto(file, { waitUntil: 'domcontentloaded' });
      await waitForCensus(page);
      await page.locator('#readinessCity').fill(city);
      const result = page.locator('.readiness-result').first();
      await expect(result).toContainText(city);
      await expect(result).toContainText('PRS');
      await expect(result).toContainText('ARS');
      await expect(result).toContainText('OPS');
    });
  }

  test('records an outcome, persists it, reloads, and recalibrates', async ({ page }) => {
    await page.goto(file, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.removeItem('vidik.learningLedger.v1'));
    await page.locator('#predictedOutcome').fill('0.50');
    await page.locator('#observedOutcome').fill('0.70');
    await page.locator('#learningCheckpoint').selectOption({ label: '6-month' });
    await page.locator('#recordOutcome').click();
    await expect(page.locator('#learningLedger')).toContainText('0.5');
    await page.locator('#recalculateModel').click();
    await expect(page.locator('#learningStoreStatus')).toContainText('Recalibration review');
    await page.reload();
    await expect(page.locator('#learningLedger')).toContainText('0.5');
    await page.evaluate(() => localStorage.removeItem('vidik.learningLedger.v1'));
  });

  test('acceptance runner executes and populates security results', async ({ page }) => {
    await page.goto(file, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#acceptanceLog')).toContainText('PASS');
    await page.locator('#runAcceptance').click();
    await expect(page.locator('#acceptanceLog')).toContainText('PASS');
    for (const id of ['secXss', 'secNumeric', 'secLinks', 'secIds']) {
      await expect(page.locator(`#${id}`)).not.toHaveText('—');
    }
  });

  test('core decision workflow remains interactive', async ({ page }) => {
    await page.goto(file, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText('Decision');
    const interactive = page.locator('button, input, select').count();
    expect(await interactive).toBeGreaterThan(5);
  });
});
