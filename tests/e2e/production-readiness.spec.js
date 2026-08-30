const {test,expect}=require('@playwright/test');

test('production readiness: provenance fails closed for invalid transportability',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(()=>{const h=window.VIDIK_92_1_HARDENING;try{h.strictTransportability({sourceGeography:'Ottawa',targetGeography:'Toronto',similarity:2});return 'accepted'}catch(e){return e.message}});
  expect(result).toBe('invalid-transportability-similarity');
});

test('production readiness: uncertainty rejects incoherent ranges',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(()=>{const h=window.VIDIK_92_1_HARDENING;try{h.strictUncertainty([{id:'x',low:2,high:1,mean:1}]);return 'accepted'}catch(e){return e.message}});
  expect(result).toContain('invalid-uncertainty-range');
});

test('production readiness: VOI rejects non-finite candidates',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(()=>{const h=window.VIDIK_92_1_HARDENING;try{h.strictVOI({candidates:[{expectedBestValue:NaN,cost:1}],currentDecision:0,decisionValue:1});return 'accepted'}catch(e){return e.message}});
  expect(result).toBe('invalid-voi-candidate');
});

test('production readiness: canonical security controls are present',async({page})=>{
  await page.goto('/');
  await expect(page.locator('#runAcceptance')).toBeVisible();
  await expect(page.locator('#acceptanceLog')).toBeVisible();
});
