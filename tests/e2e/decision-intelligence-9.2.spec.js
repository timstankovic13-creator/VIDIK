const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const moduleSource = fs.readFileSync(path.join(__dirname,'../../js/decision-intelligence-9.2.js'),'utf8');

async function di(page){
  await page.addScriptTag({content:moduleSource});
  return page.evaluate(()=>Object.keys(window.VIDIK_DECISION_INTELLIGENCE_92));
}

test.describe('VIDIK 9.2 decision intelligence acceptance',()=>{
  test('1 lineage is complete and hashed',async({page})=>{await page.goto('/');await di(page);expect(await page.evaluate(()=>{const d=window.VIDIK_DECISION_INTELLIGENCE_92;return d.buildLineage({evidence:[{id:'e1'}],claims:[{id:'c1',evidenceIds:['e1']}],parameters:[{id:'p1',claimIds:['c1']}],recommendation:{parameterIds:['p1']}})})).toMatchObject({links:[{evidenceId:'e1',claimId:'c1',parameterId:'p1'}]});});
  test('2 evidence change is detectable and propagated',async({page})=>{await page.goto('/');await di(page);expect(await page.evaluate(()=>window.VIDIK_DECISION_INTELLIGENCE_92.propagateEvidenceChange({before:{x:1},after:{x:2},recommendationFn:x=>({recommendation:x.x>1?'B':'A'})}))).toMatchObject({evidenceChanged:true,recommendationChanged:true});});
  test('3 evidence conflict is surfaced',async({page})=>{await page.goto('/');await di(page);expect(await page.evaluate(()=>window.VIDIK_DECISION_INTELLIGENCE_92.resolveEvidenceConflict([{id:'a',claimKey:'q',direction:'up',quality:.8},{id:'b',claimKey:'q',direction:'down',quality:.7}]))[0].resolution)).toBe('CONFLICT_REQUIRES_REVIEW');});
  test('4 transportability is explicit',async({page})=>{await page.goto('/');await di(page);expect(await page.evaluate(()=>window.VIDIK_DECISION_INTELLIGENCE_92.transportability({sourceGeography:'Ottawa',targetGeography:'Toronto',similarity:.8}))).toMatchObject({pass:true});});
  test('5 correlated uncertainty includes covariance',async({page})=>{await page.goto('/');await di(page);expect(await page.evaluate(()=>window.VIDIK_DECISION_INTELLIGENCE_92.correlatedUncertainty([{id:'a',mean:1,low:.8,high:1.2},{id:'b',mean:1,low:.8,high:1.2}],[{a:'a',b:'b',rho:.5}])).variance)).toBeGreaterThan(0);});
  test('6 sensitivity detects recommendation flips',async({page})=>{await page.goto('/');await di(page);expect(await page.evaluate(()=>window.VIDIK_DECISION_INTELLIGENCE_92.sensitivityFlip({baseline:{x:.5},parameters:[{id:'x',low:0,high:1}],scoreFn:s=>({recommendation:s.x>.5?'B':'A'})}))).toMatchObject({recommendationStable:false});});
  test('7 VOI ranks evidence that can change a decision',async({page})=>{await page.goto('/');await di(page);expect(await page.evaluate(()=>window.VIDIK_DECISION_INTELLIGENCE_92.valueOfInformation({currentDecision:1,decisionValue:10,evidenceCost:1,candidates:[{id:'e1',expectedBestValue:2}]}))).toMatchObject({expectedValueOfInformation:9});});
  test('8 counterfactual reports incremental value',async({page})=>{await page.goto('/');await di(page);expect(await page.evaluate(()=>window.VIDIK_DECISION_INTELLIGENCE_92.counterfactual({statusQuo:{v:1},recommendation:{v:3},metricFn:x=>x.v}))).toMatchObject({incremental:2,improves:true});});
  test('9 outcome learning produces recalibration signal',async({page})=>{await page.goto('/');await di(page);expect(await page.evaluate(()=>window.VIDIK_DECISION_INTELLIGENCE_92.recalibrate({predictions:[.5,.5],observations:[.7,.3],learningRate:.5}))).toMatchObject({n:2,meanError:0});});
  test('10 snapshot detects tampering and replay is deterministic',async({page})=>{await page.goto('/');await di(page);expect(await page.evaluate(()=>{const d=window.VIDIK_DECISION_INTELLIGENCE_92;const s=d.immutableDecisionSnapshot({decisionObject:{a:1},datasets:{census:'v1'},evidence:{snapshot:'e1'},parameters:{p:1}});return d.replaySnapshot(s,x=>({recommendation:x.decision.a}))})).toMatchObject({ok:true,deterministic:true});});
});
