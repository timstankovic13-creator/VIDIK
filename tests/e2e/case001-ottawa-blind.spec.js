const { test, expect } = require('@playwright/test');

test('Case 001 Ottawa blind runtime — strict temporal boundary and parameter provenance', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.readyState === 'complete');

  const result = await page.evaluate(() => {
    const boundary = '2023-12-06';

    for (const k of Object.keys(E)) delete E[k];
    Object.assign(E, {
      'S01-draft-budget-2024': {
        id: 'S01-draft-budget-2024', title: 'Ottawa Draft Budget 2024', sourceType: 'municipal-budget',
        url: 'https://documents.ottawa.ca/sites/default/files/Document%205%20-%20Draft%20Budget%202024%20Report.pdf',
        publishedAt: '2023-11-08', publicationDateVerified: true, retrievedAt: '2026-09-01', status: 'verified', quality: 'high', transportability: 1,
        claims: [{ id: 'S01-C01', type: 'planning-context', text: 'Draft Budget 2024 was tabled November 8, 2023 before the December 6 adoption boundary. It documents the pre-decision resource/planning environment, not the adopted decision.' }]
      },
      'S02-census-2021': {
        id: 'S02-census-2021', title: 'Statistics Canada 2021 Census Profile — Ottawa', sourceType: 'census',
        url: 'https://www12.statcan.gc.ca/census-recensement/2021/dp-pd/prof/',
        publishedAt: '2023-11-15', publicationDateVerified: true, retrievedAt: '2026-09-01', status: 'verified', quality: 'high', transportability: .95,
        claims: [{ id: 'S02-C01', type: 'structural-context', text: 'Historical Ottawa housing indicators available before the decision boundary.' }]
      },
      'S03-housing-rct': {
        id: 'S03-housing-rct', title: 'At Home/Chez Soi Housing First randomized evidence', sourceType: 'research-trial',
        url: 'https://mentalhealthcommission.ca/resource/national-at-home-chez-soi-final-report/',
        publishedAt: '2016-04-14', publicationDateVerified: true, retrievedAt: '2026-09-01', status: 'verified', quality: 'high', transportability: .78,
        claims: [{ id: 'S03-C01', type: 'causal', text: 'Canadian randomized Housing First evidence; 73% stable housing versus 31% treatment as usual; adjusted difference 42 percentage points (95% CI 36–48).' }]
      },
      'S04-ottawa-housing-2022-update': {
        id: 'S04-ottawa-housing-2022-update', title: 'Ottawa 2022 Housing and Homelessness Update', sourceType: 'municipal-program-report',
        url: 'https://documents.ottawa.ca/en/files/2022-housing-and-homelessness-update',
        publishedAt: null, publicationDateVerified: false, retrievedAt: '2026-09-01', status: 'verified', quality: 'high', transportability: 1,
        claims: [
          { id: 'S04-C01', type: 'program-output', text: '151 individuals were housed through Housing First services from January to September 2022.' },
          { id: 'S04-C02', type: 'retention', text: '82% of singles in Housing First retained housing one year after becoming housed, measured March 2015 to September 2022.' },
          { id: 'S04-C03', type: 'capacity', text: '12 new Housing Based Case Managers were added to support over 150 more clients.' },
          { id: 'S04-C04', type: 'prevention', text: 'Family homelessness prevention case conferencing reported 93% success (28 of 30 cases did not enter shelter).' }
        ],
        notes: 'Exact publication date is not verified from the City document page; strict temporal admissibility therefore excludes this source until verified.'
      }
    });

    const admissibility = Object.fromEntries(Object.entries(E).map(([id, source]) => [id, VIDIK_HistoricalParameters.admissibility(source, boundary)]));
    const admissible = Object.entries(E).filter(([id, source]) => admissibility[id].admissible).map(([id]) => id);
    for (const id of Object.keys(E)) E[id].admissibleAtBoundary = admissibility[id].admissible;

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

    const reconstruction = VIDIK_HistoricalParameters.reconstruct({
      boundary,
      sources: E,
      candidateId: 'housing',
      claimRules: [
        { parameterType: 'need', sourceIds: ['S01-draft-budget-2024','S02-census-2021'], claimType: 'structural-context', unit: 'candidate-specific need', method: 'context cannot be converted to marginal need without an explicit normalization rule' },
        { parameterType: 'baseline', sourceIds: ['S03-housing-rct'], claimType: 'causal', unit: 'proportion stable housing', value: .31, status: 'observed', evidenceQuality: 'high', causalIdentification: 'randomized', transportability: .78, uncertainty: '95% CI not normalized into Ottawa-specific marginal estimate' },
        { parameterType: 'effect', sourceIds: ['S03-housing-rct'], claimType: 'causal', unit: 'absolute proportion', value: .42, status: 'observed', evidenceQuality: 'high', causalIdentification: 'randomized', transportability: .78, uncertainty: '95% CI 0.36–0.48', method: 'difference between randomized Housing First and treatment-as-usual stable-housing proportions' },
        { parameterType: 'capacity', sourceIds: ['S04-ottawa-housing-2022-update'], claimType: 'capacity', unit: 'clients per 12 case managers', value: null, method: 'source reports staffing and client support but no defensible marginal unit conversion' },
        { parameterType: 'feasibility', sourceIds: ['S01-draft-budget-2024'], claimType: 'planning-context', unit: 'historical implementation feasibility', value: null, method: 'planning context alone does not establish feasibility of a specified marginal allocation' },
        { parameterType: 'cost', sourceIds: ['S01-draft-budget-2024'], claimType: 'planning-context', unit: 'CAD per marginal outcome', value: null, method: 'no candidate-specific marginal cost normalization' },
        { parameterType: 'timeHorizon', sourceIds: ['S03-housing-rct'], claimType: 'causal', unit: 'historical follow-up', value: null, method: 'study horizon is not a municipal marginal allocation horizon' }
      ]
    });

    document.getElementById('city').value = 'Ottawa';
    document.getElementById('pool').value = '1000000';
    document.getElementById('risk').value = '0.75';
    render();

    return {
      case: 'OTTAWA_CASE001', mode: 'blind', boundary,
      admissibleSourceIds: admissible,
      excludedSourceIds: Object.keys(E).filter(id => !admissibility[id].admissible),
      sealedSourceIds: ['X01-adopted-budget-2024','X02-2023-progress-report','X03-cmhc-2024-rental-report'],
      coreEngineVersion: V.version, lifecycleVersion: '9.6.1',
      reconstruction,
      recommendation: document.getElementById('rec').textContent || null,
      gate: document.getElementById('gate').textContent || null,
      candidateText: document.getElementById('candidates').innerText || '',
      audit: document.getElementById('audit').textContent || ''
    };
  });

  expect(result.boundary).toBe('2023-12-06');
  expect(result.admissibleSourceIds).toEqual(['S01-draft-budget-2024','S02-census-2021','S03-housing-rct']);
  expect(result.excludedSourceIds).toEqual(['S04-ottawa-housing-2022-update']);
  expect(result.coreEngineVersion).toBe('9.2.0');
  expect(result.lifecycleVersion).toBe('9.6.1');
  expect(result.reconstruction.provenanceComplete).toBe(true);
  expect(result.reconstruction.parameters.find(p => p.parameterType === 'effect').status).toBe('observed');
  expect(result.reconstruction.parameters.find(p => p.parameterType === 'effect').sourceIds).toEqual(['S03-housing-rct']);
  expect(result.reconstruction.parameters.find(p => p.parameterType === 'capacity').status).toBe('missing');
  expect(result.reconstruction.parameters.find(p => p.parameterType === 'feasibility').status).toBe('missing');
  expect(result.reconstruction.blocked).toBe(true);
  expect(result.recommendation).toBe('NO RECOMMENDATION');
  expect(result.gate).toContain('BLOCKED');
  expect(result.candidateText).toContain('BLOCKED');
  console.log('CASE001_BLIND_OUTPUT ' + JSON.stringify(result));
});
