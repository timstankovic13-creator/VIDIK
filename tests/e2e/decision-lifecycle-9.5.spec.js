const { test, expect } = require('@playwright/test');

test.describe('VIDIK 9.5 decision lifecycle', () => {
  async function ready(page) {
    await page.goto('/');
    await page.locator('#seeAnalysis').click();
    await page.locator('details.advanced').filter({hasText:'Decision lifecycle & governance'}).locator('summary').click();
    await page.evaluate(() => {
      window.VIDIK_MUNICIPAL_RECONCILIATIONS = { Ottawa:{status:'verified',schemaVersion:'geography-reconciliation.v1',identity:{geonameid:'100',name:'Ottawa',latitude:45.42,longitude:-75.69},enrichment:{provider:'WorldPop',geonameid:'100',population:100000},provenance:{identity:{provider:'GeoNames',asset:'cities500',record_id:'100'},enrichment:{provider:'WorldPop',record_id:'100'}},match:{method:'exact-or-normalized-name',score:1}} };
      return window.VIDIK_92_INTEGRATION.recompute();
    });
    await expect.poll(async()=>await page.evaluate(()=>window.VIDIK_DECISION_9_4?.runtimeStatus)).toBe('READY');
    await expect.poll(async()=>await page.evaluate(()=>!!window.VIDIK_DECISION_LIFECYCLE_9_5)).toBe(true);
  }
  test.beforeEach(async ({page})=>{await ready(page);await page.evaluate(()=>localStorage.removeItem('VIDIK_DECISION_LIFECYCLE_V9_5'));});

  test('persists a READY decision and restores it as decision memory', async ({page})=>{
    const result=await page.evaluate(async()=>window.VIDIK_DECISION_LIFECYCLE_9_5.persist());
    expect(result.ok).toBe(true); expect(result.record.schema).toBe('VIDIK.DecisionLifecycle.v9.5');
    expect(result.record.originalRecommendation).toBeTruthy(); expect(result.record.decisionObject.schema).toBe('VIDIK.DecisionObject.v9.4');
    const restored=await page.evaluate(()=>window.VIDIK_DECISION_LIFECYCLE_9_5.read());
    expect(restored.decisionId).toBe(result.record.decisionId); expect(restored.decisionObject.recommendation).toBe(result.record.originalRecommendation);
  });

  test('creates an integrity-verifiable snapshot without replacing the original recommendation', async({page})=>{
    const snap=await page.evaluate(async()=>{await window.VIDIK_DECISION_LIFECYCLE_9_5.persist();return window.VIDIK_DECISION_LIFECYCLE_9_5.snapshot()});
    expect(snap.ok).toBe(true); expect(snap.snapshot.schema).toBe('VIDIK.DecisionSnapshot.v9.5'); expect(snap.snapshot.hash).toMatch(/^[0-9a-f]+$/);
    const r=await page.evaluate(()=>window.VIDIK_DECISION_LIFECYCLE_9_5.read());
    expect(r.snapshot.hash).toBe(snap.snapshot.hash); expect(r.originalRecommendation).toBe(r.decisionObject.recommendation);
    expect((await page.evaluate(async()=>window.VIDIK_DECISION_LIFECYCLE_9_5.verify())).ok).toBe(true);
  });

  test('requires rationale and records a human override while preserving original recommendation', async({page})=>{
    await page.evaluate(async()=>window.VIDIK_DECISION_LIFECYCLE_9_5.persist());
    await page.locator('#lifecycleOverride').fill('housing-first');
    let missing=await page.evaluate(async()=>window.VIDIK_DECISION_LIFECYCLE_9_5.overrideDecision());
    expect(missing.ok).toBe(false);
    await page.locator('#lifecycleActor').fill('municipal-decision-maker'); await page.locator('#lifecycleRationale').fill('Human review selected this option based on local implementation constraints.');
    const result=await page.evaluate(async()=>window.VIDIK_DECISION_LIFECYCLE_9_5.overrideDecision());
    expect(result.ok).toBe(true); expect(result.record.status).toBe('ADOPTED'); expect(result.record.override.originalRecommendation).toBe(result.record.originalRecommendation); expect(result.record.override.overriddenTo).toBe('housing-first'); expect(result.record.override.rationale).toBeTruthy(); expect(result.record.adoptedDecision.source).toBe('HUMAN_OVERRIDE');
  });

  test('records outcome review against the adopted decision and retains lifecycle history', async({page})=>{
    await page.evaluate(async()=>window.VIDIK_DECISION_LIFECYCLE_9_5.persist());
    await page.locator('#lifecycleOverride').fill('housing-first'); await page.locator('#lifecycleActor').fill('reviewer'); await page.locator('#lifecycleRationale').fill('Adopted after human review.'); await page.evaluate(async()=>window.VIDIK_DECISION_LIFECYCLE_9_5.overrideDecision());
    await page.locator('#lifecyclePredicted').fill('100'); await page.locator('#lifecycleObserved').fill('82');
    const result=await page.evaluate(async()=>window.VIDIK_DECISION_LIFECYCLE_9_5.recordOutcome());
    expect(result.ok).toBe(true); expect(result.record.status).toBe('REVIEWED'); expect(result.record.outcomes).toHaveLength(1); expect(result.record.outcomes[0].delta).toBe(-18); expect(result.record.events.map(e=>e.type)).toEqual(expect.arrayContaining(['HUMAN_OVERRIDE','OUTCOME_REVIEW']));
  });

  test('detects tampering with persisted decision memory', async({page})=>{
    await page.evaluate(async()=>window.VIDIK_DECISION_LIFECYCLE_9_5.persist());
    await page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('VIDIK_DECISION_LIFECYCLE_V9_5'));r.decisionObject.recommendation='tampered';localStorage.setItem('VIDIK_DECISION_LIFECYCLE_V9_5',JSON.stringify(r));});
    expect((await page.evaluate(async()=>window.VIDIK_DECISION_LIFECYCLE_9_5.verify())).ok).toBe(false);
  });
});