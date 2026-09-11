const { test, expect } = require('@playwright/test');

test('Case 001 Ottawa blind runtime — strict temporal boundary, normalized provenance, and marginalization gates', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.readyState === 'complete');
  const result = await page.evaluate(() => {
    const boundary = '2023-12-06';
    const sources = {
      S01: { id:'S01', publishedAt:'2023-11-08', publicationDateVerified:true, claims:[{id:'S01-C',type:'planning-context'}] },
      S02: { id:'S02', publishedAt:'2023-11-15', publicationDateVerified:true, claims:[{id:'S02-C',type:'structural-context'}] },
      S03: { id:'S03', publishedAt:'2016-04-14', publicationDateVerified:true, claims:[{id:'S03-C',type:'causal'}] },
      S04: { id:'S04', publishedAt:null, publicationDateVerified:false, claims:[{id:'S04-C',type:'capacity'}] }
    };
    const admissibility = Object.fromEntries(Object.entries(sources).map(([id,s])=>[id,VIDIK_HistoricalParameters.admissibility(s,boundary)]));
    const reconstruction = VIDIK_HistoricalParameters.reconstruct({
      boundary, sources, candidateId:'housing',
      claimRules:[
        {parameterType:'need',sourceIds:['S02'],claimType:'structural-context',unit:'proportion',value:.351,denominator:'tenant households',geography:'Ottawa',population:'tenant households',measurementPeriod:'2021 Census',uncertainty:'descriptive; not candidate-specific',candidateSpecific:false,requiresCandidateSpecific:true,reason:'candidate-specific need remains unsupported'},
        {parameterType:'effect',sourceIds:['S03'],claimType:'causal',unit:'absolute proportion',value:.42,denominator:'950 randomized participants',geography:'five Canadian cities',population:'high-need adults',measurementPeriod:'12-month follow-up',uncertainty:'95% CI 0.36–0.48',status:'observed',evidenceQuality:'high',causalIdentification:'randomized',transportability:.78,candidateSpecific:false},
        {parameterType:'capacity',sourceIds:['S04'],claimType:'capacity',unit:'clients',value:null,denominator:'12 case managers',geography:'Ottawa',population:'Housing First',measurementPeriod:'2022',uncertainty:'not quantified'}
      ],
      marginalMap:{resourceUnit:'CAD',resourceAmount:1000000,capacityUnit:'additional placements',capacityValue:null,outcomeUnit:'participant-years',outcomeValue:null,sourceIds:['S03'],causalGate:'not-passed',transportabilityGate:'not-passed'}
    });
    return {admissibility,reconstruction,version:V.version};
  });
  expect(result.version).toBe('10.0.0');
  expect(result.admissibility.S01.admissible).toBe(true);
  expect(result.admissibility.S02.admissible).toBe(true);
  expect(result.admissibility.S03.admissible).toBe(true);
  expect(result.admissibility.S04.admissible).toBe(false);
  expect(result.reconstruction.provenanceComplete).toBe(true);
  expect(result.reconstruction.parameters.find(p=>p.parameterType==='effect').status).toBe('observed');
  expect(result.reconstruction.parameters.find(p=>p.parameterType==='capacity').status).toBe('missing');
  expect(result.reconstruction.parameters.find(p=>p.parameterType==='need').status).toBe('missing');
  expect(result.reconstruction.marginalization.status).toBe('missing');
  expect(result.reconstruction.blocked).toBe(true);
});

test('Case 001 reconstruction adversarial gates reject temporal leakage and assumption laundering', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.readyState === 'complete');
  const result = await page.evaluate(() => {
    const boundary='2023-12-06';
    const future={id:'FUTURE',publishedAt:'2024-01-15',publicationDateVerified:true};
    const unverified={id:'UNVERIFIED',publishedAt:null,publicationDateVerified:false};
    const temporal=VIDIK_HistoricalParameters.admissibility(future,boundary);
    const unknownDate=VIDIK_HistoricalParameters.admissibility(unverified,boundary);
    const reconstruction=VIDIK_HistoricalParameters.reconstruct({boundary,sources:{S:{id:'S',publishedAt:'2023-10-01',publicationDateVerified:true,claims:[{id:'S-C',type:'assumption'}]}},candidateId:'housing',claimRules:[{parameterType:'cost',sourceIds:['S'],claimType:'assumption',unit:'CAD',value:1000000,denominator:'unknown',geography:'Ottawa',population:'housing',measurementPeriod:'2023',uncertainty:'unknown',status:'assumed',assumptionJustification:'not-reviewed'}]});
    const cost=reconstruction.parameters.find(p=>p.parameterType==='cost');
    return {temporal,unknownDate,assumptionStatus:cost.status,assumptionReason:cost.reason};
  });
  expect(result.temporal.admissible).toBe(false);
  expect(result.temporal.reason).toBe('published after historical boundary');
  expect(result.unknownDate.admissible).toBe(false);
  expect(result.unknownDate.reason).toBe('publication date not verified');
  expect(result.assumptionStatus).toBe('missing');
  expect(result.assumptionReason).toContain('assumption laundering gate');
});
