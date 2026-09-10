const { test, expect } = require('@playwright/test');

test.describe('VIDIK real municipal end-to-end lifecycle validation',()=>{
  for(const city of ['Ottawa','Toronto','Melbourne']){
    test(`${city} real-source-to-learning lifecycle remains auditable`,async({page})=>{
      await page.goto('/');
      const f=await page.evaluate(city=>window.VIDIK_MUNICIPAL_LIFECYCLE_10.fixture(city),city);
      expect(f.source.url).toMatch(/^https:\/\//);
      expect(f.evidence.status).toBe('verified');
      expect(f.evidence.sourceRecordId).toBe(f.source.recordId);
      expect(f.outcome.mode).toBe('validation-fixture');

      await page.evaluate(reconciliation=>{
        window.VIDIK_MUNICIPAL_RECONCILIATIONS={[reconciliation.identity.name]:reconciliation};
      },f.reconciliation);
      await page.selectOption('#city',city);
      await page.evaluate(()=>window.VIDIK_92_INTEGRATION.recompute());
      await expect.poll(()=>page.evaluate(()=>window.VIDIK_92_INTEGRATION.status)).toBe('READY');
      await expect.poll(()=>page.evaluate(()=>({
        runtimeStatus:window.VIDIK_DECISION_9_4?.runtimeStatus,
        city:window.VIDIK_DECISION_9_4?.city?.name,
        sourceLineage:window.VIDIK_DECISION_9_4?.sourceLineage?.status,
        decisionContextStatus:window.VIDIK_DECISION_9_4?.decisionContextStatus
      }))).toEqual({runtimeStatus:'READY',city,sourceLineage:'CONTRACTED',decisionContextStatus:'READY'});
      const decisionBefore=await page.evaluate(()=>window.VIDIK_DECISION_9_4);
      expect(decisionBefore.runtimeStatus).toBe('READY');
      expect(decisionBefore.city.name).toBe(city);
      expect(decisionBefore.sourceLineage.status).toBe('CONTRACTED');
      expect(decisionBefore.decisionContextStatus).toBe('READY');
      if(city==='Melbourne'){
        expect(decisionBefore.recommendation).toBeFalsy();
        const melbourneGate=await page.evaluate(()=>window.VIDIK_92_INTEGRATION.municipalMapping.gates.housing.admissibility.admissible);
        expect(melbourneGate).toBe(false);
      } else {
        expect(decisionBefore.recommendation).toBe('housing');
      }

      await page.evaluate(()=>{
        const d=window.VIDIK_DECISION_9_4;
        window.VIDIK_MUNICIPAL_LIFECYCLE_10.attach(d.city.name,d);
        window.VIDIK_DECISION_9_4=d;
        localStorage.removeItem('VIDIK_DECISION_LIFECYCLE_V9_5');
      });
      const persisted=await page.evaluate(()=>window.VIDIK_DECISION_LIFECYCLE_9_6.persist());
      expect(persisted.ok).toBe(true);
      expect(persisted.record.decisionObject.municipalEvidence.source.url).toMatch(/^https:\/\//);
      expect(persisted.record.decisionObject.municipalEvidence.normalizedEvidence.status).toBe('verified');
      expect(persisted.record.decisionObject.municipalOutcomePlan.mode).toBe('validation-fixture');

      // Governance controls are intentionally inside a collapsed advanced panel in the product UI.
      // Open that real panel before interacting rather than weakening the UI or the lifecycle assertions.
      await page.locator('details').filter({has: page.locator('#lifecycleActor')}).evaluate(el=>{el.open=true});
      await page.fill('#lifecycleActor','municipal decision committee');
      await page.fill('#lifecycleOverride','ase');
      await page.fill('#lifecycleRationale',`Validation override for ${city}: human committee selects an alternative intervention for the lifecycle test.`);
      const overridden=await page.evaluate(()=>window.VIDIK_DECISION_LIFECYCLE_9_6.overrideDecision());
      expect(overridden.ok).toBe(true);
      expect(overridden.record.status).toBe('ADOPTED');
      expect(overridden.record.adoptedDecision.source).toBe('HUMAN_OVERRIDE');
      expect(overridden.record.override.rationale).toContain('human committee');
      expect(overridden.record.snapshot).toBeTruthy();

      for(const observation of f.outcome.checkpoints){
        const reviewed=await page.evaluate(o=>window.VIDIK_DECISION_LIFECYCLE_9_6.reviewOutcome(o.predicted,o.observed,o.checkpoint),observation);
        expect(reviewed.ok).toBe(true);
      }
      const drift=await page.evaluate(()=>window.VIDIK_DECISION_LIFECYCLE_9_6.detectDrift());
      expect(drift.ok).toBe(true);
      const errors=f.outcome.checkpoints.map(o=>Number(o.observed)-Number(o.predicted)).filter(Number.isFinite);
      const meanError=errors.reduce((a,b)=>a+b,0)/errors.length;
      const meanAbsoluteError=errors.reduce((a,b)=>a+Math.abs(b),0)/errors.length;
      const expectedDrift=Math.abs(meanError)>Math.max(1,meanAbsoluteError*.25)?'DRIFT_DETECTED':'STABLE';
      expect(drift.drift.status).toBe(expectedDrift);
      expect(drift.drift.sampleSize).toBe(2);

      if(city!=='Melbourne'){
        const target=await page.evaluate(()=>window.VIDIK_DECISION_9_4.recommendation==='housing'?'housing:effect':null);
        expect(target).toBe('housing:effect');
        const beforeRecalibration=await page.evaluate(async()=>{await window.VIDIK_92_INTEGRATION.recompute();return window.VIDIK_92_INTEGRATION.decision.score});
        const recalibrated=await page.evaluate(()=>window.VIDIK_DECISION_LIFECYCLE_9_6.recalibrate('housing:effect'));
        expect(recalibrated.ok).toBe(true);
        expect(recalibrated.record.calibration.targetParameterId).toBe('housing:effect');
        expect(recalibrated.record.snapshot).toBeTruthy();
        const after=await page.evaluate(async()=>{await window.VIDIK_92_INTEGRATION.recompute();return {score:window.VIDIK_92_INTEGRATION.decision.score,calibration:window.VIDIK_92_INTEGRATION.calibration}});
        expect(after.calibration.targetParameterId).toBe('housing:effect');
        expect(after.score).not.toBe(beforeRecalibration);
      }

      const memory=await page.evaluate(()=>window.VIDIK_DECISION_LIFECYCLE_9_6.memory());
      expect(memory.ok).toBe(true);
      expect(memory.override.overriddenTo).toBe('ase');
      expect(memory.adoptedDecision.source).toBe('HUMAN_OVERRIDE');
      expect(memory.outcomes).toHaveLength(2);
    });
  }
});
