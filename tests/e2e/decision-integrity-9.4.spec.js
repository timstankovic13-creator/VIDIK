const { test, expect } = require('@playwright/test');

test.describe('VIDIK 9.4 decision integrity', () => {
  async function supplyVerifiedOttawaReconciliation(page) {
    await page.evaluate(() => {
      window.VIDIK_MUNICIPAL_RECONCILIATIONS = {
        Ottawa: {
          status:'verified',
          schemaVersion:'geography-reconciliation.v1',
          identity:{geonameid:'100',name:'Ottawa',latitude:45.42,longitude:-75.69},
          enrichment:{provider:'WorldPop',geonameid:'100',population:100000},
          provenance:{identity:{provider:'GeoNames',asset:'cities500',record_id:'100'},enrichment:{provider:'WorldPop',record_id:'100'}},
          match:{method:'exact-or-normalized-name',score:1}
        }
      };
    });
    await page.evaluate(async () => {
      await window.VIDIK_92_INTEGRATION.recompute();
      document.getElementById('city')?.dispatchEvent(new Event('input',{bubbles:true}));
    });
  }

  async function ready(page) {
    await page.goto('/');
    await supplyVerifiedOttawaReconciliation(page);
    await expect.poll(async () => await page.evaluate(() => window.VIDIK_92_INTEGRATION?.status)).toBe('READY');
    await expect.poll(async () => await page.evaluate(() => window.VIDIK_92_INTEGRATION?.decisionContextStatus)).toBe('READY');
    await expect.poll(async () => await page.evaluate(() => window.VIDIK_DECISION_9_4?.runtimeStatus)).toBe('READY');
  }

  test('default decision is a complete auditable decision object', async ({ page }) => {
    await ready(page);
    const d = await page.evaluate(() => window.VIDIK_DECISION_9_4);
    expect(d.schema).toBe('VIDIK.DecisionObject.v9.4');
    expect(d.objective).toBeTruthy();
    expect(d.city.name).toBe('Ottawa');
    expect(d.resources).toEqual(expect.objectContaining({unit:'CAD',pool:1000000}));
    expect(d.baseline.id).toBe('status-quo');
    expect(d.alternatives.length).toBeGreaterThan(0);
    expect(d.recommendation).toBeTruthy();
    expect(d.evidence.records).toBeGreaterThan(0);
    expect(d.evidence.verified).toBeGreaterThan(0);
    expect(d.uncertainty.preserved).toBe(true);
    expect(d.learning.checkpoints).toEqual(['6-month','1-year','2-year','5-year']);
    expect(d.lineage).toBeTruthy();
    expect(Array.isArray(d.lineage.links)).toBe(true);
    expect(d.provenance.evidence_hash).toBeTruthy();
    expect(d.runtimeStatus).toBe('READY');
  });

  test('allocation is fail-closed when validated capacity cannot cover the pool', async ({ page }) => {
    await ready(page);
    const result = await page.evaluate(() => ({d:window.VIDIK_DECISION_9_4,frontier:document.getElementById('frontier').textContent}));
    expect(result.d.allocation.status).toBe('blocked');
    expect(result.d.allocation.conserved).toBe(false);
    expect(result.d.allocation.reason).toBeNull();
    expect(result.frontier).toContain('Allocation: BLOCKED');
  });

  test('allocation, recommendation, and audit update together when resources change', async ({ page }) => {
    await ready(page);
    await page.locator('#pool').fill('750000');
    await page.locator('#pool').dispatchEvent('input');
    await expect.poll(async () => await page.evaluate(() => window.VIDIK_DECISION_9_4?.resources?.pool)).toBe(750000);
    await expect.poll(async () => await page.evaluate(() => window.VIDIK_DECISION_9_4?.runtimeStatus)).toBe('READY');
    const result = await page.evaluate(() => {
      const d=window.VIDIK_DECISION_9_4, audit=JSON.parse(document.getElementById('audit').textContent);
      const sum=Object.values(d.allocation.allocations||{}).reduce((a,b)=>a+Number(b||0),0);
      return {d,audit,sum};
    });
    expect(result.d.allocation.status).toBe('complete');
    expect(result.d.allocation.conserved).toBe(true);
    expect(result.sum).toBe(750000);
    expect(result.audit.decision_object.resources.pool).toBe(750000);
    expect(result.audit.decision_object.recommendation).toBe(result.d.recommendation);
  });

  test('decision contains the complete decision chain and synchronized runtime evidence', async ({ page }) => {
    await ready(page);
    const result = await page.evaluate(() => {
      const d=window.VIDIK_DECISION_9_4,s=window.VIDIK_92_INTEGRATION,a=JSON.parse(document.getElementById('audit').textContent);
      const linkIds=new Set((d.lineage?.links||[]).map(x=>String(x.parameterId)));
      return {recommendation:d.recommendation, linkedRecommendation:([...linkIds].some(id=>id.startsWith(String(d.recommendation)+':'))), source:d.sourceLineage?.status, context:d.decisionContext?.status, sensitivity:!!d.sensitivity, voi:!!d.voi, counterfactual:!!d.counterfactual, audit:a.decision_object, hash:s.lastEvidenceHash};
    });
    expect(result.recommendation).toBeTruthy();
    expect(result.linkedRecommendation).toBe(true);
    expect(result.source).toBe('CONTRACTED');
    expect(result.context).toBe('READY');
    expect(result.sensitivity).toBe(true);
    expect(result.voi).toBe(true);
    expect(result.counterfactual).toBe(true);
    expect(result.audit.recommendation).toBe(result.recommendation);
    expect(result.audit.provenance.evidence_hash).toBe(result.hash);
  });

  test('changing risk recomputes the same decision object rather than creating a parallel result', async ({ page }) => {
    await ready(page);
    const before=await page.evaluate(()=>({rev:window.VIDIK_92_INTEGRATION.revision,rec:window.VIDIK_DECISION_9_4.recommendation}));
    await page.locator('#risk').fill('0.20');
    await page.locator('#risk').dispatchEvent('input');
    await expect.poll(async()=>await page.evaluate(()=>window.VIDIK_92_INTEGRATION.revision)).toBeGreaterThan(before.rev);
    await expect.poll(async()=>await page.evaluate(()=>window.VIDIK_DECISION_9_4?.runtimeStatus)).toBe('READY');
    const after=await page.evaluate(()=>({rev:window.VIDIK_92_INTEGRATION.revision,rec:window.VIDIK_DECISION_9_4.recommendation,audit:JSON.parse(document.getElementById('audit').textContent)}));
    expect(after.rev).toBeGreaterThan(before.rev);
    expect(after.audit.decision_object.recommendation).toBe(after.rec);
    expect(after.audit.decision_object.runtimeStatus).toBe('READY');
  });
});