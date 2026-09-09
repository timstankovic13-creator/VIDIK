const { test, expect } = require('@playwright/test');

test.describe('VIDIK production browser/mobile acceptance', () => {
  test('loads the decision workspace and exposes the critical workflow', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/VIDIK 9\.6/);
    await expect(page.locator('main.wrap')).toBeVisible();
    await expect(page.getByText('Evidence → Claim → Parameter → Decision')).toBeVisible();
    await expect(page.getByText('Outcome learning')).toBeVisible();
    await expect(page.getByText('Decision memory → outcome review → recalibration / drift')).toBeVisible();
    await expect(page.getByText('Security & acceptance')).toBeVisible();
    await expect(page.locator('#city')).toBeVisible();
    await expect(page.locator('#pool')).toBeVisible();
    await expect(page.locator('#risk')).toBeVisible();
    await expect(page.locator('#recordOutcome')).toBeVisible();
    await expect(page.locator('#recalculateModel')).toBeVisible();
    await expect(page.locator('#runAcceptance')).toBeVisible();
  });

  test('supports the three reference municipalities in the decision selector', async ({ page }) => {
    await page.goto('/');
    const city = page.locator('#city');
    await expect(city.locator('option')).toHaveText(['Ottawa', 'Toronto', 'Melbourne']);
    for (const value of ['Ottawa', 'Toronto', 'Melbourne']) {
      await city.selectOption({ label: value });
      await expect(city).toHaveValue(value);
    }
  });

  test('has no horizontal viewport overflow and usable critical controls on mobile', async ({ page }) => {
    await page.goto('/');
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);

    for (const selector of [
      '#city', '#pool', '#risk', '#readinessCity', '#predictedOutcome',
      '#observedOutcome', '#learningCheckpoint', '#recordOutcome',
      '#recalculateModel', '#persistDecision', '#verifyDecision', '#runAcceptance',
    ]) {
      await expect(page.locator(selector)).toBeVisible();
      await expect(page.locator(selector)).toBeEnabled();
    }
  });

  test('critical controls expose an accessible name', async ({ page }) => {
    await page.goto('/');
    const controls = [
      '#city', '#pool', '#risk', '#readinessCity', '#readinessCountry', '#readinessLimit',
      '#predictedOutcome', '#observedOutcome', '#learningCheckpoint', '#recordOutcome',
      '#recalculateModel', '#exportLearning', '#clearLearning', '#persistDecision',
      '#snapshotDecision', '#applyOverride', '#verifyDecision', '#recordLifecycleOutcome',
      '#v96ReviewOutcome', '#v96Recalibrate', '#v96DetectDrift', '#runAcceptance',
    ];
    for (const selector of controls) {
      const name = await page.locator(selector).evaluate((el) => {
        const labelledBy = el.getAttribute('aria-labelledby');
        const labelledText = labelledBy
          ? labelledBy.split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ')
          : '';
        const label = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
        return (el.getAttribute('aria-label') || labelledText || label?.textContent || el.getAttribute('placeholder') || el.textContent || '').trim();
      });
      expect(name, `${selector} must have an accessible name`).not.toBe('');
    }
  });
});
