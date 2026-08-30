const { test, expect } = require('@playwright/test');

test.describe('VIDIK 9.2.1 hardening',()=>{
  test.beforeEach(async({page})=>{await page.goto('/');await page.waitForFunction(()=>window.VIDIK_92_INTEGRATION?.status==='READY');});
  test('strict transportability rejects out-of-range and non-numeric similarity',async({page})=>{
    const r=await page.evaluate(()=>{const d=window.VIDIK_DECISION_INTELLIGENCE_92;const out=[];for(const x of [-.01,1.01,NaN,'0.8']){try{d.transportability({sourceGeography:'Ottawa',targetGeography:'Toronto',similarity:x});out.push('accepted')}catch(e){out.push(e.message)}}return out;});
    expect(r).toEqual(['invalid-transportability-similarity','invalid-transportability-similarity','invalid-transportability-similarity','invalid-transportability-similarity']);
  });
  test('strict uncertainty rejects incoherent ranges, means and duplicate correlations',async({page})=>{
    const r=await page.evaluate(()=>{const d=window.VIDIK_DECISION_INTELLIGENCE_92;const base=[{id:'a',low:.2,high:.8,mean:.5},{id:'b',low:.1,high:.9,mean:.5}];const cases=[()=>d.correlatedUncertainty([{id:'a',low:.8,high:.2,mean:.5}]),()=>d.correlatedUncertainty([{id:'a',low:.2,high:.8,mean:.9}]),()=>d.correlatedUncertainty(base,[{a:'a',b:'b',rho:.2},{a:'b',b:'a',rho:.2}]),()=>d.correlatedUncertainty(base,[{a:'a',b:'b',rho:1.2}])];return cases.map(f=>{try{f();return 'accepted'}catch(e){return e.message}});});
    expect(r[0]).toContain('invalid-uncertainty-range');expect(r[1]).toContain('invalid-uncertainty-range');expect(r[2]).toBe('duplicate-correlation');expect(r[3]).toBe('invalid-correlation');
  });
  test('strict VOI rejects non-finite and negative cost/value inputs',async({page})=>{
    const r=await page.evaluate(()=>{const d=window.VIDIK_DECISION_INTELLIGENCE_92;const cases=[()=>d.valueOfInformation({currentDecision:NaN,candidates:[]}),()=>d.valueOfInformation({currentDecision:1,decisionValue:Infinity,candidates:[]}),()=>d.valueOfInformation({currentDecision:1,evidenceCost:-1,candidates:[]}),()=>d.valueOfInformation({currentDecision:1,candidates:[{id:'x',expectedBestValue:NaN,cost:0}]})];return cases.map(f=>{try{f();return 'accepted'}catch(e){return e.message}});});
    expect(r).toEqual(['invalid-voi-input','invalid-voi-input','invalid-voi-input','invalid-voi-candidate']);
  });
  test('integrated VOI is evidence-linked and not zeroed by a blanket placeholder',async({page})=>{
    const s=await page.evaluate(()=>window.VIDIK_92_INTEGRATION);expect(s.voi).toBeTruthy();expect(Array.isArray(s.voi.ranked)).toBeTruthy();expect(s.voi.ranked.every(x=>Array.isArray(x.evidenceIds))).toBeTruthy();
  });
  test('integrated counterfactual is tied to recommendation effect evidence',async({page})=>{
    const s=await page.evaluate(()=>window.VIDIK_92_INTEGRATION);expect(s.counterfactual).toBeTruthy();expect(s.counterfactual.semantics).toContain('evidence-linked effect');expect(s.counterfactual.recommendation.evidenceIds.length).toBeGreaterThan(0);expect(s.counterfactual.incremental).toBeGreaterThan(0);
  });
});
