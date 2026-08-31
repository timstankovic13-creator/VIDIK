const { test, expect } = require('@playwright/test');

test.describe('municipal decision context', () => {
  const verified = (city, id, population) => ({
    status: 'verified',
    identity: { geonameid: id, name: city, latitude: 45, longitude: -75 },
    enrichment: { provider: 'WorldPop', geonameid: id, population },
    provenance: {
      identity: { provider: 'GeoNames', asset: 'cities500', record_id: id },
      enrichment: { provider: 'WorldPop', record_id: id }
    },
    match: { method: 'exact-or-normalized-name', score: 1 }
  });

  test('verified GeoNames identity and WorldPop population become one typed decision context', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(() => {
      const A = window.VIDIK_CITY_SOURCE_ADAPTERS;
      return ['Ottawa','Toronto','Melbourne'].map((city, i) => A.decisionContext(city, {
        status:'verified',
        identity:{geonameid:String(100+i),name:city,latitude:45+i,longitude:-75-i},
        enrichment:{provider:'WorldPop',geonameid:String(100+i),population:100000+i},
        provenance:{identity:{provider:'GeoNames',record_id:String(100+i)},enrichment:{provider:'WorldPop',record_id:String(100+i)}}
      }));
    });
    expect(result).toHaveLength(3);
    for (const [i, city] of ['Ottawa','Toronto','Melbourne'].entries()) {
      expect(result[i]).toMatchObject({schemaVersion:'municipal-decision-context.v1',city,identity:{provider:'GeoNames'},population:{provider:'WorldPop',value:100000+i}});
      expect(result[i].identity.recordId).toBe(String(100+i));
      expect(result[i].population.recordId).toBe(String(100+i));
    }
  });

  test('fails closed on unverified, mismatched, or missing enrichment', async ({ page }) => {
    await page.goto('/');
    const errors = await page.evaluate(() => {
      const A = window.VIDIK_CITY_SOURCE_ADAPTERS;
      const cases = [
        {city:'Ottawa', r:{status:'unresolved'}},
        {city:'Toronto', r:{status:'verified',identity:{geonameid:'1'},enrichment:{provider:'WorldPop',geonameid:'2',population:1},provenance:{identity:{provider:'GeoNames',record_id:'1'},enrichment:{provider:'WorldPop',record_id:'2'}}}},
        {city:'Melbourne', r:{status:'verified',identity:{geonameid:'3'},enrichment:null,provenance:{identity:{provider:'GeoNames',record_id:'3'}}}}
      ];
      return cases.map(x=>{try{A.decisionContext(x.city,x.r);return null}catch(e){return e.message}});
    });
    expect(errors).toEqual(['municipal-context-geography-not-verified','municipal-context-geonames-id-mismatch','municipal-context-missing-worldpop']);
  });
});
