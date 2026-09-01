const { test, expect } = require('@playwright/test');

test('Case 001 Ottawa blind runtime — strict temporal boundary', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.readyState === 'complete');

  const result = await page.evaluate(() => {
    const boundary = '2023-12-06';

    for (const k of Object.keys(E)) delete E[k];
    Object.assign(E, {
      'S01-draft-budget-2024': {
        id: 'S01-draft-budget-2024', title: 'Ottawa Draft Budget 2024', sourceType: 'municipal-budget',
        url: 'https://documents.ottawa.ca/sites/default/files/Document%205%20-%20Draft%20Budget%202024%20Report.pdf',
        publishedAt: '2023-11-08', retrievedAt: '2026-09-01', status: 'verified', quality: 'high', transportability: 1,
        claims: [{ type: 'planning-context', text: 'Draft Budget 2024 was tabled November 8, 2023 before the December 6 adoption boundary.' }],
        notes: 'Pre-decision planning context only; not evidence of the adopted decision.'
      },
      'S02-census-2021': {
        id: 'S02-census-2021', title: 'Statistics Canada 2021 Census Profile — Ottawa', sourceType: 'census',
        url: 'https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/',
        publishedAt: '2023-11-15', retrievedAt: '2026-09-01', status: 'verified', quality: 'high', transportability: .95,
        claims: [{ type: 'structural-context', text: 'Historical Ottawa housing indicators available before the decision boundary.' }],
        notes: 'Context only; not a Housing First causal effect.'
      },
      'S03-housing-rct': {
        id: 'S03-housing-rct', title: 'At Home/Chez Soi Housing First randomized evidence', sourceType: 'research-trial',
        url: 'https://mentalhealthcommission.ca/resource/national-at-home-chez-soi-final-report/',
        publishedAt: '2016-04-14', retrievedAt: '2026-09-01', status: 'verified', quality: 'high', transportability: .78,
        claims: [{ type: 'causal', text: 'Canadian randomized Housing First evidence; 73% stable housing versus 31% treatment as usual; adjusted difference 42 percentage points (95% CI 36–48).' }],
        notes: 'Causal evidence, but not an Ottawa marginal allocation estimate.'
      }
    });

    const housing = C.find(x => x.id === 'housing');
    if (housing) {
      housing.params.need = null;
      housing.params.capacity = null;
      housing.params.feasibility = null;
      housing.params.effect.evidenceIds = ['S03-housing-rct'];
    }
    for (const c of C.filter(x => x.id !== 'housing')) {
      c.params.need = null;
      c.params.effect = null;
      c.params.capacity = null;
      c.params.feasibility = null;
    }

    document.getElementById('city').value = 'Ottawa';
    document.getElementById('pool').value = '1000000';
    document.getElementById('risk').value = '0.75';
    render();

    return {
      case: 'OTTAWA_CASE001',
      mode: 'blind',
      boundary,
      admissibleSourceIds: Object.keys(E),
      sealedSourceIds: ['X01-adopted-budget-2024','X02-2023-progress-report','X03-cmhc-2024-rental-report'],
      engineVersion: V.version,
      recommendation: document.getElementById('rec').textContent || null,
      gate: document.getElementById('gate').textContent || null,
      candidateText: document.getElementById('candidates').innerText || '',
      audit: document.getElementById('audit').textContent || ''
    };
  });

  expect(result.boundary).toBe('2023-12-06');
  expect(result.admissibleSourceIds).toEqual(['S01-draft-budget-2024','S02-census-2021','S03-housing-rct']);
  expect(result.engineVersion).toBe('9.2.0');
  expect(result.recommendation).toBe('NO RECOMMENDATION');
  expect(result.gate).toContain('BLOCKED');
  expect(result.candidateText).toContain('BLOCKED');
  console.log('CASE001_BLIND_OUTPUT ' + JSON.stringify(result));
});
