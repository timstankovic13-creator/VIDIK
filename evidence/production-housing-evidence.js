'use strict';

/*
 * Production evidence registry for the first real three-city decision slice.
 * Municipal observations remain observational context. These records are the
 * separate causal evidence required before VIDIK can recommend the intervention.
 */

const PRODUCTION_HOUSING_EVIDENCE = Object.freeze({
  Ottawa: Object.freeze({
    id: 'housing-first-canada-rct-42pp-ottawa-transported',
    estimate: 0.42,
    unit: 'absolute stable-housing probability difference',
    uncertainty: { low: 0.36, high: 0.48 },
    evidenceType: 'causal',
    source: 'One-year outcomes of a randomized controlled trial of Housing First with ACT in five Canadian cities',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/25639993/',
    sourceJurisdiction: 'Canada',
    targetJurisdiction: 'Ottawa, Canada',
    mode: 'transported',
    asOf: '2015-02-02',
    provenance: 'PubMed PMID 25639993; five-city Canadian randomized controlled trial; 73% versus 31% stably housed; adjusted absolute difference 42%, 95% CI 36%-48%.',
    transportability: {
      admissible: true,
      similarity: 0.94,
      basis: 'same national housing and health system; Canadian evidence; Ottawa is not a trial site, so the effect is explicitly transported rather than site-claimed.'
    }
  }),
  Toronto: Object.freeze({
    id: 'housing-first-canada-rct-42pp-toronto-site',
    estimate: 0.42,
    unit: 'absolute stable-housing probability difference',
    uncertainty: { low: 0.36, high: 0.48 },
    evidenceType: 'causal',
    source: 'One-year outcomes of a randomized controlled trial of Housing First with ACT in five Canadian cities',
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/25639993/',
    siteSourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/22978561/',
    sourceJurisdiction: 'Canada',
    targetJurisdiction: 'Toronto, Canada',
    mode: 'site-supported',
    asOf: '2015-02-02',
    provenance: 'PubMed PMID 25639993; the Canadian five-city RCT reported a 42 percentage-point adjusted absolute difference. PubMed PMID 22978561 documents the Toronto randomized trial site and its Housing First intervention.',
    transportability: {
      admissible: true,
      similarity: 1.0,
      basis: 'Toronto was an actual At Home/Chez Soi randomized trial site; no cross-country causal transport is required.'
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
