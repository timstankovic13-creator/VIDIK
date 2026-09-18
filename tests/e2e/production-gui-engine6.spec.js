const { test, expect } = require('@playwright/test');

test.describe('VIDIK production decision-chain GUI', () => {
  test('renders the live decision chain from the real browser state', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#productionDecisionGui')).toBeVisible();
    await expect(page.locator('#productionDecisionGui')).toContainText('LIVE DECISION CHAIN');

    const problem = page.locator('#decisionProblem');
    await problem.fill('Reduce violent crime');
    await expect(page.locator('#productionDecisionGui')).toContainText('Reduce violent crime');
    await expect(page.locator('#productionDecisionGui')).toContainText('Intervention universe');
    await expect(page.locator('#productionDecisionGui')).toContainText('Evidence');

    const state = await page.evaluate(() => window.VIDIK_GUI_STATE);
    expect(state.problem).toBe('Reduce violent crime');
    expect(state.blocked).toBe(true);
    expect(state.recommendation).toMatch(/NO RECOMMENDATION|cannot establish|blocked/i);\n    await expect(page.locator('#answerFirst')).toContainText('Intervention universe identified');\n    await expect(page.locator('#answerFirst')).toContainText('Hot-spots policing');\n    await expect(page.locator('#answerFirst')).toContainText('Focused deterrence');\n    await expect(page.locator('#answerFirst')).toContainText('Community violence intervention');
  });

  test('keeps navigation attached to real Options, Evidence, Uncertainty and Audit surfaces', async ({ page }) => {
    await page.goto('/index.html');
    for (const [label, target] of [['Inspect options','optionsSection'],['Inspect evidence','evidence'],['Inspect uncertainty / VOI','uncertaintySection'],['Inspect audit','auditSection']]) {
      await page.getByRole('button', { name: label }).click();
      await expect(page.locator(`#${target}`)).toBeAttached();
    }
  });
});
