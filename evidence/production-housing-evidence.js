'use strict';

/*
 * Production evidence registry for the first real three-city decision slice.
 * Municipal observations remain observational context. These records are the
 * separate causal evidence required before VIDIK can recommend the intervention.
 */

const PRODUCTION_HOUSING_EVIDENCE = Object.freeze({
  Ottawa: Object.freeze({
    id: 'housing-first-canada-small-city-rct-312or-ottawa-transported',
    estimate: 3.12,
    unit: 'odds ratio for stable housing',
    uncertainty: { low: 1.96, high: 4.27 },
    evidenceType: 'causal',
    source: 'A randomized controlled trial of the effectiveness of Housing First in a small Canadian City',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/31438912/',
    sourceJurisdiction: 'Canada',
    targetJurisdiction: 'Ottawa, Canada',
    mode: 'transported',
    asOf: '2019-08-22',
    provenance: 'PubMed PMID 31438912; two-year randomized controlled trial of Housing First with ACT versus treatment as usual in a Canadian city. Housing First participants were about three times as likely to be stably housed (OR 3.12, 95% CI 1.96-4.27). The study was not conducted in Ottawa, so the effect is explicitly transported rather than site-claimed.',
    transportability: {
      admissible: true,
      similarity: 0.94,
      basis: 'same national housing and health system; Canadian randomized evidence; Ottawa is not the study site, so the effect is explicitly transported.'
    }
  }),
  Toronto: Object.freeze({
    id: 'housing-first-toronto-rct-458pp-stable-housing-time',
    estimate: 45.8,
    unit: 'percentage-point difference in mean proportion of time stably housed',
    uncertainty: { low: 37.1, high: 54.4 },
    evidenceType: 'causal',
    source: 'How did a Housing First intervention improve health and social outcomes among homeless adults with mental illness in Toronto? Two-year outcomes from a randomised trial',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/27619826/',
    siteSourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/22978561/',
    sourceJurisdiction: 'Canada',
    targetJurisdiction: 'Toronto, Canada',
    mode: 'site-supported',
    asOf: '2016-09-12',
    provenance: 'PubMed PMID 27619826; Toronto At Home/Chez Soi randomized trial, n=197 high-needs participants. Housing First plus ACT spent 45.8 percentage points more time stably housed than treatment as usual over two years (95% CI 37.1%-54.4%). PubMed PMID 22978561 documents the Toronto randomized trial site.',
    transportability: {
      admissible: true,
      similarity: 1.0,
      basis: 'Toronto was the actual randomized trial site; no cross-country causal transport is required.'
    }
  }),
  Melbourne: Object.freeze({
    id: 'j2si-phase2-melbourne-rct-339pp',
    estimate: 0.339,
    unit: 'absolute permanent-housing probability difference',
    uncertainty: { low: 0.161, high: 0.517 },
    evidenceType: 'causal',
    source: 'Chronic homelessness in Melbourne: The final outcomes of Journey to Social Inclusion Phase 2',
    sourceUrl: 'https://sacredheartmission.org/wp-content/uploads/2021/12/j2si-phase-2-final-year-outcomes-quantitative-report.pdf',
    secondarySourceUrl: 'https://assets.csi.edu.au/assets/research/J2SI-Third-Year-Outcomes-Report.pdf',
    sourceJurisdiction: 'Melbourne, Australia',
    targetJurisdiction: 'Melbourne, Australia',
    mode: 'site-supported',
    asOf: '2020-12-31',
    provenance: 'Sacred Heart Mission/Centre for Social Impact J2SI Phase 2 randomized study: 62.2% permanent housing in the intervention group versus 28.3% in the comparison group at Wave 7. Estimate is the unadjusted absolute difference (33.9 percentage points).',
    uncertaintyMethod: 'Reconstructed unadjusted 95% Wald interval from the reported matched-sample proportions and sample sizes (J n=37, E n=53); this interval is model-derived and is not presented as a source-reported confidence interval.',
    transportability: {
      admissible: true,
      similarity: 1.0,
      basis: 'The causal study was conducted in inner-city Melbourne and directly evaluated the J2SI housing/support model against existing services.'
    }
  })
});

module.exports = { PRODUCTION_HOUSING_EVIDENCE };
