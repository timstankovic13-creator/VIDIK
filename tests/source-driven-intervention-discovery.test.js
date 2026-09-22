'use strict';
// Literature recall regression is intentionally kept in the fast discovery suite.

const assert = require('node:assert/strict');
const test = require('node:test');
const { taxonomyTerms, expandDiscoveryVocabulary, buildCkanSearchUrl, buildGovUkSearchUrl, extractCkanInterventionLeads, extractGovUkInterventionLeads, extractOpenAlexInterventionLeads, discoverSourceDrivenInterventions } = require('../js/source-driven-intervention-discovery');
const { executeDecisionDiscovery } = require('../js/decision-discovery-execution');

const GOVUK_SOURCE = {
  sourceId: 'uk-gov-program-discovery', provider: 'GOV.UK Search API', jurisdiction: 'UK',
  domain: 'intervention-universe', tier: 'official_machine_readable', accessMethod: 'govuk-search-api',
  url: 'https://www.gov.uk/api/search.json'
};

const SOURCE = {
  sourceId: 'ca-program-discovery', provider: 'Government of Canada Open Government Portal', jurisdiction: 'CA',
  domain: 'intervention-universe', tier: 'official_machine_readable', accessMethod: 'ckan-action-api',
  url: 'https://open.canada.ca/data/en/api/3/action/package_search?q='
};

function mockResponse(value) {
  const bytes = Buffer.from(JSON.stringify(value));
  return { ok: true, status: 200, headers: { get: key => key === 'content-type' ? 'application/json' : null }, arrayBuffer: async () => bytes };
}

test('live default discovery preserves wildfire-smoke recall through the literature fallback', async () => {
  const result = await discoverSourceDrivenInterventions({
    problem: 'reduce wildfire smoke exposure',
    jurisdiction: 'CA',
    fetchImpl: async url => {
      const parsed = new URL(url);
      if (parsed.hostname === 'api.openalex.org') {
        return mockResponse({ results: [{
          id: 'W-wildfire-smoke',
          display_name: 'Wildfire smoke exposure and mitigation',
          abstract_inverted_index: {
            'This': [0], 'study': [1], 'describes': [2], 'wildfire': [3],
            'smoke': [4], 'mitigation': [5], 'approaches': [6]
          }
        }] });
      }
      return mockResponse({ result: { results: [] } });
    }
  });
  assert.ok(result.candidates.some(candidate => /wildfire smoke mitigation/i.test(candidate.name)));
  assert.ok(result.candidates.every(candidate => candidate.discovery?.leadOnly === true));
  assert.ok(result.candidates.every(candidate => candidate.discovery?.effectsImported === false));
  assert.equal(result.recommendationEligible, false);
});

test('GOV.UK discovery extracts official intervention-program leads without importing effects', () => {
  const leads = extractGovUkInterventionLeads({ results: [
    { title: 'Digital Inclusion Innovation Fund', description: 'Funding for local digital inclusion interventions and projects.', link: '/government/publications/digital-inclusion-innovation-fund', format: 'guidance' }
  ] }, GOVUK_SOURCE, 'reduce digital access gaps', 'municipal');
  assert.equal(leads.length, 1);
  assert.equal(leads[0].name, 'Digital Inclusion Innovation Fund');
  assert.equal(leads[0].discovery.leadOnly, true);
  assert.equal(leads[0].discovery.effectsImported, false);
  assert.equal(leads[0].discovery.provenance[0].sourceId, GOVUK_SOURCE.sourceId);
});

test('GOV.UK extraction recognizes schemes and funds when the intervention is described by the official page', () => {
  const leads = extractGovUkInterventionLeads({ results: [
    { title: 'Gigabit Broadband Voucher Scheme', description: 'A voucher scheme that funds eligible broadband installation for local premises.', link: '/guidance/gigabit-broadband-voucher-scheme', format: 'guidance' },
    { title: 'Digital Inclusion Action Plan', description: 'A government action plan for improving digital inclusion and access.', link: '/government/publications/digital-inclusion-action-plan', format: 'policy' }
  ] }, GOVUK_SOURCE, 'reduce digital access gaps', 'municipal');
  assert.equal(leads.length, 2);
  assert.deepEqual(leads.map(lead => lead.name), ['Gigabit Broadband Voucher Scheme', 'Digital Inclusion Action Plan']);
});

test('OpenAlex literature fallback retains a query-backed wildfire intervention without requiring a separate research cue', () => {
  const source = { sourceId: 'openalex-works', provider: 'OpenAlex', jurisdiction: 'international', domain: 'intervention-universe', url: 'https://api.openalex.org/works?search=' };
  const leads = extractOpenAlexInterventionLeads({ results: [{ id: 'W-WILDFIRE', display_name: 'Wildfire smoke exposure outcomes', abstract_inverted_index: {
    'This': [0], 'study': [1], 'describes': [2], 'wildfire': [3], 'smoke': [4], 'mitigation': [5], 'measures': [6]
  } }] }, source, 'reduce wildfire smoke exposure', 'municipal', 'wildfire smoke mitigation');
  assert.ok(leads.some(lead => lead.name === 'wildfire smoke mitigation'));
  assert.ok(leads.every(lead => lead.discovery.leadOnly === true && lead.discovery.effectsImported === false));
});

test('OpenAlex abstract-backed literature retains intervention leads when the title omits the intervention term', () => {
  const source = { sourceId: 'openalex-works', provider: 'OpenAlex', jurisdiction: 'international', domain: 'intervention-universe', url: 'https://api.openalex.org/works?search=' };
  const leads = extractOpenAlexInterventionLeads({ results: [{ id: 'W1', display_name: 'Youth employment outcomes', abstract_inverted_index: {
    'We': [0], 'evaluated': [1], 'a': [2], 'job': [3], 'placement': [4], 'programme': [5], 'for': [6], 'young': [7], 'people': [8]
  } }] }, source, 'reduce youth unemployment', 'municipal', 'reduce youth unemployment job placement');
  assert.ok(leads.some(lead => /job placement/i.test(lead.name)));
  assert.ok(leads.every(lead => lead.discovery.leadOnly === true && lead.discovery.effectsImported === false));
});

test('bounded thesaurus expansion broadens problem vocabulary before intervention-family search', () => {
  const variants = expandDiscoveryVocabulary('reduce violent crime', 'municipal', 8);
  assert.equal(variants[0], 'reduce violent crime');
  assert.ok(variants.includes('reduce serious violence'));
  assert.ok(variants.includes('reduce community violence'));
  assert.ok(variants.length <= 8);
  assert.ok(!variants.some(value => /dataset|statistics|report/i.test(value)));
});

test('workspace thesaurus uses pertinent terminology for non-municipal discovery', () => {
  const business = expandDiscoveryVocabulary('reduce customer churn', 'business', 8);
  const enterprise = expandDiscoveryVocabulary('reduce digital access gaps', 'enterprise', 8);
  assert.ok(business.includes('reduce customer attrition'));
  assert.ok(enterprise.includes('reduce digital divide'));
});

test('digital-access taxonomy expands into concrete intervention queries', () => {
  const terms = taxonomyTerms('reduce digital access gaps', 'municipal');
  assert.ok(terms.includes('digital inclusion'));
  assert.ok(terms.includes('broadband voucher scheme'));
  assert.ok(terms.includes('digital lifeline fund'));
});

test('GOV.UK extraction can use intervention signals in the official description', () => {
  const leads = extractGovUkInterventionLeads({ results: [
    { title: 'Digital inclusion', description: 'A government programme provides device grants and broadband vouchers to improve access.', link: '/digital-inclusion', format: 'guide' }
  ] }, GOVUK_SOURCE, 'reduce digital access gaps', 'municipal');
  assert.equal(leads.length, 1);
  assert.equal(leads[0].name, 'Digital inclusion');
});

test('GOV.UK query construction remains HTTPS and bounded', () => {
  const url = new URL(buildGovUkSearchUrl(GOVUK_SOURCE, 'digital inclusion', { rows: 10 }));
  assert.equal(url.protocol, 'https:');
  assert.equal(url.searchParams.get('q'), 'digital inclusion');
  assert.equal(url.searchParams.get('count'), '10');
  assert.equal(url.searchParams.get('fields'), 'title,description,link,format');
  assert.throws(() => buildGovUkSearchUrl(GOVUK_SOURCE, 'digital inclusion', { rows: 101 }), /page-size-invalid/);
});

test('weak live discovery expands through the workspace taxonomy without importing effects', async () => {
  const result = await discoverSourceDrivenInterventions({
    problem: 'reduce youth unemployment', jurisdiction: 'AU',
    sources: [
      { sourceId: 'au-open-data-program-discovery', provider: 'Australian Government Data Catalogue', jurisdiction: 'AU', domain: 'intervention-universe', url: 'https://data.gov.au/data/api/3/action/package_search?q=' }
    ],
    fetchImpl: async () => mockResponse({ result: { results: [] } })
  });
  assert.equal(result.candidates.length, 0);
  assert.equal(result.recommendationEligible, false);
  assert.ok(result.sourceSearches.some(search => search.sourceId === 'au-open-data-program-discovery'));
  assert.ok(result.sourceSearches.some(search => search.status === 'search-failed' || search.status === 'searched-empty'));
});

test('CKAN discovery creates potential leads with provenance and no imported effects', async () => {
  const result = await discoverSourceDrivenInterventions({
    problem: 'food insecurity', sources: [SOURCE], fetchImpl: async () => mockResponse({ result: { results: [
      { id: 'food-program-1', title: 'Community food access program', notes: 'Local food support and access.', tags: [{ name: 'food' }, { name: 'poverty' }] }
    ] } })
  });
  assert.equal(result.candidates.length, 1);
  const lead = result.candidates[0];
  assert.equal(lead.evidenceStatus, 'potential');
  assert.equal(lead.discovery.discoveryOnly, true);
  assert.equal(lead.discovery.effectsImported, false);
  assert.equal(lead.discovery.provenance[0].sourceId, SOURCE.sourceId);
  assert.equal(result.recommendationEligible, false);
  assert.equal(result.sourceSearches[0].status, 'candidates-found');
});

test('source-driven discovery is wired into decision execution and remains evidence-gated', async () => {
  const run = await executeDecisionDiscovery({
    problem: 'food insecurity',
    requiredSourceTypes: ['intervention-library'],
    autoDiscoverInterventionSources: true,
    fetchImpl: async () => mockResponse({ result: { results: [
      { id: 'food-program-2', title: 'Municipal food access program', notes: 'Food access intervention.' }
    ] } }),
    statusQuo: { explicit: true, id: 'status-quo-food' }
  });
  assert.equal(run.candidates.length, 1);
  assert.equal(run.candidates[0].discovery.sourceType, 'intervention-library');
  assert.equal(run.candidates[0].discovery.effectsImported, false);
  assert.equal(run.candidates[0].evidenceState, 'evidence-gap');
  assert.equal(run.governance.recommendationAllowed, false);
});

test('source-driven discovery records upstream failure instead of inventing an empty result', async () => {
  const result = await discoverSourceDrivenInterventions({ problem: 'urban flooding', sources: [SOURCE], fetchImpl: async () => mockResponse({ error: true }) });
  assert.equal(result.sourceSearches[0].status, 'search-failed');
  assert.equal(result.candidates.length, 0);
});

test('mobility problems retain infrastructure interventions during semantic relevance filtering', async () => {
  const result = await discoverSourceDrivenInterventions({
    problem: 'reduce traffic fatalities', jurisdiction: 'CA', sources: [SOURCE],
    fetchImpl: async () => mockResponse({ result: { results: [
      { id: 'traffic-enforcement', title: 'Traffic safety enforcement program', notes: 'Municipal enforcement intervention for road safety.' },
      { id: 'road-infrastructure', title: 'Road safety infrastructure project', notes: 'Infrastructure intervention improving road safety and reducing traffic fatalities.' }
    ] } })
  });
  assert.ok(result.candidates.some(candidate => /traffic safety enforcement/i.test(candidate.name)));
  assert.ok(result.candidates.some(candidate => /road safety infrastructure/i.test(candidate.name)));
  assert.ok(result.candidates.every(candidate => candidate.discovery.leadOnly === true));
  assert.equal(result.recommendationEligible, false);
});

test('CKAN query construction remains HTTPS and bounded', () => {
  const url = new URL(buildCkanSearchUrl(SOURCE, 'reduce violent crime', { rows: 25 }));
  assert.equal(url.protocol, 'https:');
  assert.equal(url.searchParams.get('q'), 'reduce violent crime');
  assert.equal(url.searchParams.get('rows'), '25');
  assert.throws(() => buildCkanSearchUrl(SOURCE, 'crime', { rows: 101 }), /page-size-invalid/);
});


test('legacy intervention classes are a coverage guard, not synthetic candidates', () => {
  const mod = require('../js/source-driven-intervention-discovery');
  const coverage = mod.interventionClassCoverage('reduce violent crime', 'municipal', [
    { name: 'Focused deterrence program', discoveryText: 'focused deterrence for serious violence' },
    { name: 'Community violence intervention', discoveryText: 'community violence intervention' }
  ]);
  assert.ok(coverage.expectedClasses.length > 0);
  assert.ok(coverage.representedClasses.some(name => /focused deterrence/i.test(name)));
  assert.ok(coverage.missingClasses.length > 0);
  const queries = mod.buildDiscoveryQueries('reduce violent crime', 'municipal');
  assert.ok(queries.length <= mod.DISCOVERY_MAX_QUERIES_PER_SOURCE);
  assert.ok(queries.some(q => /hot-spots policing|problem-oriented policing|victim services|justice-system diversion|focused deterrence/i.test(q)));
});


test('intervention extraction rejects administrative artifacts that masquerade as interventions', () => {
  const { isActionableInterventionTitle, classifyCkanRecord } = require('../js/source-driven-intervention-discovery');
  assert.equal(isActionableInterventionTitle('Audit of staffing and classification service delivery'), false);
  assert.equal(isActionableInterventionTitle('Regulatory Casework Review 2026'), false);
  assert.equal(isActionableInterventionTitle('Funding allocations for Seniors Active Living Centre programs'), false);
  assert.equal(isActionableInterventionTitle('Digital Inclusion Innovation Fund'), true);
  assert.equal(classifyCkanRecord({ title: 'Audit of staffing and classification service delivery', notes: 'Audit report.' }).accepted, false);
});

test('intervention precision rejects administrative program records without rejecting real interventions', () => {
  const { isActionableInterventionTitle } = require('../js/source-driven-intervention-discovery');
  assert.equal(isActionableInterventionTitle('Implementing nuclear regulatory taskforce review: letter from Philip Duffy to Chancellor of the Exchequer'), false);
  assert.equal(isActionableInterventionTitle('GC HR and Pay - Program Management Committee, 2025 Jan to Jun'), false);
  assert.equal(isActionableInterventionTitle('Nationally Significant Infrastructure Projects: Pre-Application Advice on Environmental Impact Assessment'), false);
  assert.equal(isActionableInterventionTitle('Grow With Wyre Woodland Improvement Grant Project Area'), false);
  assert.equal(isActionableInterventionTitle('Preventive Maintenance Program'), true);
  assert.equal(isActionableInterventionTitle('Stormwater Infrastructure Project'), true);
  assert.equal(isActionableInterventionTitle('Community Violence Intervention Program'), true);
});

test('missing-class discovery is stratified across relevant workspace domains', () => {
  const { missingInterventionClassSearchQueries } = require('../js/source-driven-intervention-discovery');
  const queries = missingInterventionClassSearchQueries('reduce traffic fatalities', 'municipal', []);
  assert.ok(queries.length > 1);
  assert.ok(queries.some(q => /road engineering|traffic calming|speed management/i.test(q)));
  assert.ok(queries.some(q => /maintenance|renewal|replacement|infrastructure/i.test(q)));
});

test('nonmunicipal workspaces expose distinct intervention coverage rather than municipal fallback', () => {
  const { legacyClassTerms } = require('../js/source-driven-intervention-discovery');
  const business = legacyClassTerms('reduce employee burnout', 'business');
  const community = legacyClassTerms('improve community accessibility', 'community');
  const research = legacyClassTerms('study infrastructure interventions', 'research');
  const enterprise = legacyClassTerms('reduce cybersecurity incident risk', 'enterprise');
  assert.ok(business.some(term => /manager training|employee assistance|flexible scheduling/i.test(term)));
  assert.ok(community.some(term => /accessible design|assistive technology|inclusive service/i.test(term)));
  assert.ok(research.some(term => /capital intervention|infrastructure retrofit|asset renewal/i.test(term)));
  assert.ok(enterprise.some(term => /zero trust|multi factor authentication|endpoint detection/i.test(term)));
});

test('class-level missing-option expansion is bounded and source-backed', async () => {
  const { discoverSourceDrivenInterventions, DISCOVERY_MAX_QUERIES_PER_SOURCE } = require('../js/source-driven-intervention-discovery');
  const seen = [];
  const result = await discoverSourceDrivenInterventions({
    problem: 'reduce traffic fatalities',
    jurisdiction: 'CA',
    sources: [{
      sourceId: 'ca-program-discovery',
      provider: 'Government of Canada Open Government Portal',
      jurisdiction: 'CA',
      domain: 'intervention-universe',
      tier: 'official_machine_readable',
      accessMethod: 'ckan-action-api',
      url: 'https://open.canada.ca/data/en/api/3/action/package_search?q='
    }],
    fetchImpl: async url => {
      const q = new URL(url).searchParams.get('q');
      seen.push(q);
      if (/road engineering|maintenance|renewal|replacement/i.test(q)) {
        return mockResponse({ result: { results: [{
          id: 'class-expansion',
          title: 'Road safety infrastructure project',
          notes: 'Infrastructure project improving road safety and reducing traffic fatalities.'
        }] } });
      }
      return mockResponse({ result: { results: [{
        id: 'traffic-enforcement',
        title: 'Traffic safety enforcement program',
        notes: 'Municipal enforcement intervention for road safety.'
      }] } });
    }
  });
  assert.ok(result.candidates.some(candidate => /road safety infrastructure/i.test(candidate.name)));
  assert.ok(result.interventionUniverse.diagnosticCounts.missingOptionSearchUsed);
  assert.ok(result.sourceSearches[0].queriesAttempted <= DISCOVERY_MAX_QUERIES_PER_SOURCE);
  assert.ok(seen.length <= DISCOVERY_MAX_QUERIES_PER_SOURCE);
});


test('semantic relevance rejects same-domain decoys that do not address the decision problem', () => {
  const { interventionMatchesProblem } = require('../js/source-driven-intervention-discovery');
  assert.equal(
    interventionMatchesProblem('improve emergency response coordination', { name: 'NSW Climate Change Fund 2015-2016' }, 'enterprise'),
    false
  );
  assert.equal(
    interventionMatchesProblem('reduce regulatory compliance delays', { name: 'Measures to improve local audit delays' }, 'enterprise'),
    false
  );
  assert.equal(
    interventionMatchesProblem('reduce urban flooding', { name: 'Stormwater Infrastructure Project' }, 'municipal'),
    true
  );
  assert.equal(
    interventionMatchesProblem('reduce violent crime', { name: 'Community Violence Intervention Program' }, 'municipal'),
    true
  );
});
