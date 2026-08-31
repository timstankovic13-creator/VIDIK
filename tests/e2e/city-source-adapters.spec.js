const { test, expect } = require('@playwright/test');

test.describe('VIDIK city source adapters', () => {
  test('Ottawa Toronto Melbourne have reproducible source contracts', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(() => {
      const A = window.VIDIK_CITY_SOURCE_ADAPTERS;
      return {
        version: A && A.version,
        cities: A && A.cities,
        sources: A && A.cities.map(c => A.get(c)),
        provenance: A && A.cities.map(c => A.provenance(c, `test-${c.toLowerCase()}`, '2026-08-31T00:00:00Z'))
      };
    });
    expect(result.version).toBe('1.0.0');
    expect(result.cities).toEqual(expect.arrayContaining(['Ottawa', 'Toronto', 'Melbourne']));
    for (const source of result.sources) {
      expect(source.status).toBe('reproducible');
      expect(source.identityAuthority).toBe('GeoNames');
      expect(source.populationEnrichment).toBe('WorldPop');
      expect(source.sourceUrl).toMatch(/^https:\/\//);
    }
    for (const p of result.provenance) {
      expect(p.recordId).toMatch(/^test-/);
      expect(p.provider).toBeTruthy();
      expect(p.identityAuthority).toBe('GeoNames');
      expect(p.populationEnrichment).toBe('WorldPop');
    }
  });

  test('adapter validation fails closed on missing provenance', async ({ page }) => {
    await page.goto('/');
    const result = await page.evaluate(() => {
      const A = window.VIDIK_CITY_SOURCE_ADAPTERS;
      return [
        A.validate(null),
        A.validate({ city: 'Ottawa' }),
        A.validate({ city: 'Atlantis', provenance: { recordId: 'x', provider: 'x' } })
      ];
    });
    expect(result.map(x => x.valid)).toEqual([false, false, false]);
    expect(result.map(x => x.reason)).toEqual(['invalid-record', 'missing-provenance', 'unsupported-city']);
  });
});
