const {test,expect}=require('@playwright/test');

test('frozen decision lifecycle: persistence → snapshot → override → outcome review → recalibration → drift → integrity',async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.evaluate(()=>{window.VIDIK_DECISION_9_4={runtimeStatus:'READY',recommendation:null,objective:'Frozen Cases 001-014 historical decision set',decisionBoundary:'2023-12-06'};});

  const persisted=await page.evaluate(()=>window.VIDIK_DECISION_LIFECYCLE_9_6.persist());
  expect(persisted.ok).toBe(true);
  expect(persisted.record.status).toBe('ANALYSIS');

  const snap=await page.evaluate(()=>window.VIDIK_DECISION_LIFECYCLE_9_6.snapshot());
  expect(snap.ok).toBe(true);
  expect(snap.record.snapshot.hash).toBeTruthy();

  await page.locator('#lifecycleActor').fill('human-reviewer');
  await page.locator('#lifecycleOverride').fill('status-quo');
  await page.locator('#lifecycleRationale').fill('Frozen historical evidence set is blocked; human adoption must remain explicit.');
  const overridden=await page.evaluate(()=>window.VIDIK_DECISION_LIFECYCLE_9_6.overrideDecision());
  expect(overridden.ok).toBe(true);
  expect(overridden.record.status).toBe('ADOPTED');
  expect(overridden.record.override.rationale).toContain('Frozen historical evidence set');

  const first=await page.evaluate(()=>window.VIDIK_DECISION_LIFECYCLE_9_6.reviewOutcome(100,120,'1-year'));
  expect(first.ok).toBe(true);
  const second=await page.evaluate(()=>window.VIDIK_DECISION_LIFECYCLE_9_6.reviewOutcome(100,130,'2-year'));
  expect(second.ok).toBe(true);

  const drift=await page.evaluate(()=>window.VIDIK_DECISION_LIFECYCLE_9_6.detectDrift());
  expect(drift.ok).toBe(true);
  expect(drift.drift.status).toBe('DRIFT_DETECTED');
  expect(drift.drift.sampleSize).toBe(2);

  const recal=await page.evaluate(()=>window.VIDIK_DECISION_LIFECYCLE_9_6.recalibrate('housing.capacity'));
  expect(recal.ok).toBe(true);
  expect(recal.record.calibration.targetParameterId).toBe('housing.capacity');
  expect(recal.record.calibration.sampleSize).toBe(2);

  const memory=await page.evaluate(()=>window.VIDIK_DECISION_LIFECYCLE_9_6.memory());
  expect(memory.ok).toBe(true);
  expect(memory.override.overriddenTo).toBe('status-quo');
  expect(memory.outcomes).toHaveLength(2);
  expect(memory.snapshotHash).toBeTruthy();
  expect(memory.integrityHash).toBeTruthy();

  const verified=await page.evaluate(()=>window.VIDIK_DECISION_LIFECYCLE_9_6.verify());
  expect(verified.ok).toBe(true);
});
