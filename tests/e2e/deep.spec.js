const { test, expect } = require('@playwright/test');
const fs = require('fs');
const zlib = require('zlib');

const DATA_DIR = 'data';
const CHUNKS = Array.from({ length: 10 }, (_, i) => `census-${String(i + 1).padStart(2, '0')}.b64`);

function decodeChunk(name) {
  const raw = fs.readFileSync(`${DATA_DIR}/${name}`, 'utf8').trim();
  expect(raw.length).toBeGreaterThan(0);
  return JSON.parse(zlib.gunzipSync(Buffer.from(raw, 'base64')).toString('utf8'));
}

test.describe('VIDIK 9.1.3 deep hostile validation', () => {
  test('all census chunks exist, decode, and have valid records', async () => {
    const all = [];
    for (const name of CHUNKS) {
      const rows = decodeChunk(name);
      expect(Array.isArray(rows), `${name} is not an array`).toBeTruthy();
      expect(rows.length, `${name} is empty`).toBeGreaterThan(0);
      all.push(...rows);
    }
    expect(all.length).toBe(12138);
    const ids = all.map(r => String(r.id ?? r.city_id ?? r.cityId ?? ''));
    expect(ids.every(Boolean)).toBeTruthy();
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of all) expect(JSON.stringify(r)).not.toMatch(/NaN|Infinity/);
  });

  test('census contains Ottawa, Toronto, and Melbourne', async () => {
    const all = CHUNKS.flatMap(decodeChunk);
    const text = all.map(r => JSON.stringify(r).toLowerCase()).join('\n');
    for (const city of ['ottawa', 'toronto', 'melbourne']) expect(text).toContain(city);
  });

  test('browser census load is complete', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#censusStatus')).toContainText('LOADED');
    await expect(page.locator('#censusCount')).toHaveText('12,138');
  });

  test('decision output remains finite across city/resource/risk matrix', async ({ page }) => {
    await page.goto('/');
    for (const city of ['Ottawa', 'Toronto', 'Melbourne']) {
      for (const pool of ['0', '1', '100000', '1000000', '100000000']) {
        for (const risk of ['0', '0.25', '0.75', '1']) {
          await page.locator('#city').selectOption(city);
          await page.locator('#pool').fill(pool);
          await page.locator('#pool').press('Tab');
          await page.locator('#risk').fill(risk);
          await page.locator('#risk').press('Tab');
          const values = await page.evaluate(() => [document.querySelector('#recommendation')?.textContent || '', document.querySelector('#audit')?.textContent || '', document.querySelector('#objective')?.textContent || '']);
          expect(values.join('\n')).not.toMatch(/NaN|Infinity/);
        }
      }
    }
  });

  test('negative resource input fails closed', async ({ page }) => {
    await page.goto('/');
    await page.locator('#pool').fill('-1');
    await page.locator('#pool').press('Tab');
    await expect(page.locator('#gate')).toContainText('BLOCKED');
  });

  test('risk boundary behavior is stable', async ({ page }) => {
    await page.goto('/');
    await page.locator('#risk').fill('0');
    await page.locator('#risk').press('Tab');
    const zero = await page.locator('#recommendation').textContent();
    await page.locator('#risk').fill('1');
    await page.locator('#risk').press('Tab');
    const one = await page.locator('#recommendation').textContent();
    expect(zero).toBeTruthy();
    expect(one).toBeTruthy();
    expect([zero, one].join(' ')).not.toMatch(/NaN|undefined/);
  });

  test('city switching changes audit identity without corrupting census', async ({ page }) => {
    await page.goto('/');
    const audits = [];
    for (const city of ['Ottawa', 'Toronto', 'Melbourne', 'Ottawa']) {
      await page.locator('#city').selectOption(city);
      audits.push(await page.locator('#audit').textContent());
    }
    expect(audits[0]).toContain('"city": "Ottawa"');
    expect(audits[1]).toContain('"city": "Toronto"');
    expect(audits[2]).toContain('"city": "Melbourne"');
    expect(audits[3]).toContain('"city": "Ottawa"');
    await expect(page.locator('#censusCount')).toHaveText('12,138');
  });

  test('XSS payloads never become executable markup', async ({ page }) => {
    await page.goto('/');
    let fired = false;
    await page.exposeFunction('xssProbe', () => { fired = true; });
    await page.locator('#readinessCity').fill('<img src=x onerror="xssProbe()"><script>xssProbe()</script>');
    await page.locator('#readinessCity').press('Tab');
    await expect(page.locator('#readinessResults img')).toHaveCount(0);
    await expect(page.locator('#readinessResults script')).toHaveCount(0);
    expect(fired).toBeFalsy();
  });

  test('required decision transparency surfaces are populated', async ({ page }) => {
    await page.goto('/');
    for (const id of ['why', 'uncertainty', 'voi', 'audit', 'pipeline', 'candidates']) await expect(page.locator(`#${id}`)).toContainText(/./);
    const audit = await page.locator('#audit').textContent();
    expect(() => JSON.parse(audit)).not.toThrow();
  });

  test('built-in hostile suite has no failures', async ({ page }) => {
    await page.goto('/');
    await page.locator('#runAcceptance').click();
    const log = await page.locator('#acceptanceLog').textContent();
    expect(log).not.toMatch(/FAIL/);
    expect((log.match(/PASS/g) || []).length).toBeGreaterThanOrEqual(20);
  });

  test('learning ledger round-trip does not corrupt decision state', async ({ page }) => {
    await page.goto('/');
    await page.locator('#predictedOutcome').fill('100');
    await page.locator('#observedOutcome').fill('90');
    await page.locator('#recordOutcome').click();
    await page.locator('#recalculateModel').click();
    await expect(page.locator('#learningLedger')).toContainText('100');
    await expect(page.locator('#audit')).toContainText('"city"');
    expect(await page.locator('body').textContent()).not.toMatch(/NaN|Infinity/);
  });

  test('all critical controls remain available on mobile', async ({ page }) => {
    for (const id of ['city', 'pool', 'risk', 'recommendation', 'runAcceptance', 'recordOutcome']) await expect(page.locator(`#${id}`)).toBeVisible();
  });
});
