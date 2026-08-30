const {test,expect}=require('@playwright/test');

test('production hostile: malformed input fails closed',async({page})=>{await page.goto('/');const r=await page.evaluate(()=>{try{return window.VIDIK_92_1_HARDENING.strictVOI({candidates:[{expectedBestValue:'x',cost:1}],currentDecision:0,decisionValue:1})}catch(e){return e.message}});expect(r).toBe('invalid-voi-candidate')});

test('production hostile: uncertainty rejects mean outside bounds',async({page})=>{await page.goto('/');const r=await page.evaluate(()=>{try{return window.VIDIK_92_1_HARDENING.strictUncertainty([{id:'x',low:0,high:1,mean:2}])}catch(e){return e.message}});expect(r).toContain('invalid-uncertainty-range')});

test('production hostile: transportability rejects invalid geography',async({page})=>{await page.goto('/');const r=await page.evaluate(()=>{try{return window.VIDIK_92_1_HARDENING.strictTransportability({sourceGeography:'',targetGeography:'Ottawa',similarity:.8})}catch(e){return e.message}});expect(r).toBe('invalid-transportability-geography')});

test('production hostile: canonical app exposes acceptance controls',async({page})=>{await page.goto('/');await expect(page.locator('#runAcceptance')).toBeVisible();await expect(page.locator('#acceptanceLog')).toBeVisible()});
