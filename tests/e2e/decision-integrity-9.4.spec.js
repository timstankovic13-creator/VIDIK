const { test, expect } = require('@playwright/test');

test.describe('VIDIK 9.4 decision integrity', () => {
  test('default decision exposes a complete auditable decision object', async ({ page }) => {
    await page.goto('/');
    await expect.poll(async () => await page.evaluate(() => Boolean(window.VIDIK_DECISION_9_4))).toBe(true);
    const d = await page.evaluate(() => window.VIDIK_DECISION_9_4);
    expect(d.schema).toBe('VIDIK.DecisionObject.v9.4');
    expect(d.objective).toBeTruthy();
    expect(d.city.name).toBe('Ottawa');
    expect(d.resources.unit).toBe('CAD');
    expect(d.resources.pool).toBe(1000000);
    expect(d.baseline.id).toBe('status-quo');
    expect(d.alternatives.length).toBeGreaterThan(0);
    expect(d.recommendation).toBeTruthy();
    expect(d.evidence.records).toBeGreaterThan(0);
    expect(d.evidence.verified).toBeGreaterThan(0);
    expect(d.uncertainty.preserved).toBe(true);
    expect(d.learning.checkpoints).toEqual(['6-month','1-year','2-year','5-year']);
  });

  test('resource allocation is fail-closed when validated capacity cannot cover the pool', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(() => ({
      decision: window.VIDIK_DECISION_9_4,
      frontier: document.getElementById('frontier').textContent
    }));
    expect(result.decision.allocation.status).toBe('blocked');
    expect(result.decision.allocation.conserved).toBe(false);
    expect(result.decision.allocation.reason).toBeNull();
    expect(result.frontier).toContain('Allocation: BLOCKED');
  });

  test('allocation becomes complete when the pool fits validated candidate capacity', async ({ page }) => {
    await page.goto('/');
    await page.locator('#pool').fill('750000');
    await page.locator('#pool').dispatchEvent('input');
    await expect.poll(async () => await page.evaluate(() => window.VIDIK_DECISION_9_4?.allocation?.conserved)).toBe(true);
    const allocation = await page.evaluate(() => window.VIDIK_DECISION_9_4.allocation);
    expect(allocation.status).toBe('complete');
    expect(Object.values(allocation.allocations).reduce((a, b) => a + b, 0)).toBe(750000);
  });

  test('decision audit embeds the same decision object exposed to the runtime', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(() => {
      const d = window.VIDIK_DECISION_9_4;
      const audit = JSON.parse(document.getElementById('audit').textContent);
      return { sameSchema: audit.decision_object.schema === d.schema, sameRecommendation: audit.decision_object.recommendation === d.recommendation, hasBaseline: audit.decision_object.baseline.id === 'status-quo' };
    });
    expect(result.sameSchema).toBe(true);
    expect(result.sameRecommendation).toBe(true);
    expect(result.hasBaseline).toBe(true);
  });
});
