const {test,expect}=require('@playwright/test');

test.describe('VIDIK geographic reconciliation v1',()=>{
  test('GeoNames identity is authoritative and WorldPop only enriches',async({page})=>{
    await page.goto('/');
    const result=await page.evaluate(()=>window.VIDIK_GEOGRAPHY({city:'Ottawa',country_code:'CA'},[
      {geonameid:6094817,name:'Ottawa',latitude:45.4215,longitude:-75.6972,country_code:'CA',alternate_names:['Ottawa']}
    ],[
      {geonameid:6094817,population:1057000}
    ]));
    expect(result.status).toBe('verified');
    expect(result.identity.geonameid).toBe('6094817');
    expect(result.enrichment.provider).toBe('WorldPop');
    expect(result.provenance.identity.provider).toBe('GeoNames');
  });

  test('ambiguous geographic matches fail closed',async({page})=>{
    await page.goto('/');
    const result=await page.evaluate(()=>window.VIDIK_GEOGRAPHY({city:'Springfield',country_code:'US'},[
      {geonameid:1,name:'Springfield',latitude:1,longitude:1,country_code:'US'},
      {geonameid:2,name:'Springfield',latitude:2,longitude:2,country_code:'US'}
    ],[]));
    expect(result.status).toBe('ambiguous');
    expect(result.identity).toBeUndefined();
  });

  test('unresolved cities do not receive invented identity or enrichment',async({page})=>{
    await page.goto('/');
    const result=await page.evaluate(()=>window.VIDIK_GEOGRAPHY({city:'Not A Real Place',country_code:'CA'},[
      {geonameid:6094817,name:'Ottawa',latitude:45.4215,longitude:-75.6972,country_code:'CA'}
    ],[{geonameid:6094817,population:1057000}]));
    expect(result.status).toBe('unresolved');
    expect(result.identity).toBeUndefined();
    expect(result.enrichment).toBeUndefined();
  });
});
