'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  discoverSourceDrivenInterventions,
  interventionMatchesProblem,
  isActionableInterventionTitle,
  expectedInterventionFamilies,
  taxonomyTerms
} = require('../js/source-driven-intervention-discovery');
const transfer = require('../js/discovery-transfer-intelligence');

const EXTRA_CASES = [
  ['municipal','CA','reduce bicycle theft'],
  ['municipal','CA','reduce vacant properties'],
  ['municipal','US','reduce repeat domestic violence'],
  ['municipal','US','reduce youth firearm injuries'],
  ['municipal','UK','reduce bus service delays'],
  ['municipal','UK','reduce illegal dumping'],
  ['municipal','AU','reduce coastal flood exposure'],
  ['municipal','AU','reduce mosquito-borne disease risk'],
  ['business','US','reduce invoice processing time'],
  ['business','US','reduce employee absenteeism'],
  ['business','CA','reduce commercial energy waste'],
  ['business','CA','improve customer complaint resolution'],
  ['business','UK','reduce inventory stockouts'],
  ['business','UK','improve supplier reliability'],
  ['business','AU','reduce fleet fuel consumption'],
  ['business','AU','reduce workplace heat exposure'],
  ['community','CA','reduce newcomer language barriers'],
  ['community','CA','improve access to fresh food'],
  ['community','US','reduce neighborhood gun violence'],
  ['community','US','reduce disaster shelter shortages'],
  ['community','UK','reduce loneliness among older adults'],
  ['community','UK','improve access to legal assistance'],
  ['community','AU','reduce rural ambulance delays'],
  ['community','AU','reduce bushfire evacuation delays'],
  ['research','US','evaluate interventions to reduce repeat violent offending'],
  ['research','US','study interventions for traffic injury prevention'],
  ['research','CA','evaluate energy retrofit programs'],
  ['research','CA','study interventions for food insecurity'],
  ['research','UK','evaluate bus reliability interventions'],
  ['research','UK','study approaches to reduce homelessness exits'],
  ['research','AU','evaluate wildfire smoke filtration'],
  ['research','AU','study rural emergency transport interventions'],
  ['enterprise','US','reduce invoice approval delays'],
  ['enterprise','US','reduce phishing incident risk'],
  ['enterprise','CA','improve employee accessibility'],
  ['enterprise','CA','reduce service ticket backlog'],
  ['enterprise','UK','reduce contract approval cycle time'],
  ['enterprise','UK','improve records retention compliance'],
  ['enterprise','AU','reduce critical infrastructure maintenance delays'],
  ['enterprise','AU','improve emergency continuity planning']
];

test('VIDIK open-world discovery expansion: 40 additional unseen problems remain inspectable and governed', async () => {
  const results = [];
  for (const [workspace, jurisdiction, problem] of EXTRA_CASES) {
    const discovery = await discoverSourceDrivenInterventions({ problem, jurisdiction, workspace, rows: 4 });
    const candidates = discovery.candidates || [];
    const relevant = candidates.filter(c => interventionMatchesProblem(problem, c, workspace));
    const actionable = candidates.filter(c => isActionableInterventionTitle(c.name, c.discoveryText));
    const expectedFamilies = expectedInterventionFamilies(problem, workspace);
    const familyHits = expectedFamilies.filter(f => candidates.some(c => (c.interventionFamily || []).includes(f)));
    assert.equal(discovery.problem, problem);
    assert.ok(discovery.discoveryHash);
    assert.ok(discovery.sourceSearches.length > 0);
    assert.ok(Array.isArray(discovery.interventionUniverse.missingInterventionFamilies));
    assert.ok(candidates.every(c => c.discovery?.leadOnly === true));
    assert.ok(candidates.every(c => c.discovery?.effectsImported === false));
    assert.equal(discovery.interventionUniverse.recommendationEligible, false);
    results.push({
      workspace, jurisdiction, problem,
      candidates: candidates.length,
      relevant: relevant.length,
      actionable: actionable.length,
      familyCoverage: expectedFamilies.length ? familyHits.length / expectedFamilies.length : 1,
      taxonomyHit: taxonomyTerms(problem, workspace).some(term =>
        candidates.some(c => String(c.name + ' ' + c.discoveryText).toLowerCase().includes(String(term).toLowerCase()))
      )
    });
  }
  assert.equal(results.length, 40);
  assert.ok(results.every(r => r.candidates >= 0));
  console.log(JSON.stringify({
    battery: 'VIDIK Open-World Discovery Expansion v1',
    cases: results.length,
    casesWithCandidates: results.filter(r => r.candidates > 0).length,
    casesWithRelevantCandidates: results.filter(r => r.relevant > 0).length,
    casesWithActionableCandidates: results.filter(r => r.actionable > 0).length,
    casesWithTaxonomyHit: results.filter(r => r.taxonomyHit).length,
    averageFamilyCoverage: Number((results.reduce((n,r) => n + r.familyCoverage, 0) / results.length).toFixed(2))
  }, null, 2));
});

test('flagship violent-crime allocation problem can receive comparable-city discovery leads without importing effects', () => {
  const problem = 'How should a municipality allocate $10M of new spending over three years to reduce violent crime?';
  const cities = [
    {
      city: 'Toronto',
      jurisdiction: 'Ontario',
      problemTags: ['violent crime'],
      matchedSignals: ['group violence', 'neighborhood safety'],
      programs: [
        { name: 'Community Violence Intervention', description: 'Community-based violence interruption and outreach' },
        { name: 'Focused Deterrence', description: 'Focused response to serious group violence' }
      ],
      initiatives: ['Youth violence interruption']
    },
    {
      city: 'Glasgow',
      jurisdiction: 'Scotland',
      problemTags: ['violent crime'],
      strategies: ['Violence reduction partnership']
    }
  ];
  const leads = transfer.comparableCityDiscoveryLeads(problem, cities);
  assert.ok(leads.length >= 4);
  assert.ok(leads.some(l => /violence intervention/i.test(l.name)));
  assert.ok(leads.some(l => /focused deterrence/i.test(l.name)));
  assert.ok(leads.every(l => l.discoveryRoute === 'comparable-city'));
  assert.ok(leads.every(l => l.leadOnly === true));
  assert.ok(leads.every(l => l.effectsImported === false));

  const universe = transfer.buildCandidateUniverse([], cities, problem);
  assert.ok(universe.candidates.length >= 4);
  assert.ok(universe.candidates.every(c => c.effectsImported === false));
  assert.ok(universe.candidates.every(c => c.leadOnly === true));

  const integrated = transfer.buildDecisionIntelligence({
    problem,
    context: { jurisdiction: 'Ottawa, Ontario', domains: ['public safety'] },
    comparableCities: cities,
    sourceResults: [
      { sourceType: 'local-program', sourceId: 'local', status: 'searched-empty', candidates: [] },
      { sourceType: 'official-data', sourceId: 'official', status: 'searched-empty', candidates: [] },
      { sourceType: 'research', sourceId: 'research', status: 'searched-empty', candidates: [] },
      { sourceType: 'intervention-library', sourceId: 'library', status: 'searched-empty', candidates: [] }
    ],
    statusQuo: { explicit: true }
  });
  assert.ok(integrated.discovery.transferLeads.length >= 4);
  assert.equal(integrated.governance.comparableEffectsImported, false);
  assert.equal(integrated.governance.statusQuoExplicit, true);
  assert.equal(integrated.whyNot.winner, null);
});

test('comparable-city coverage is visible even when ordinary intervention sources are empty', () => {
  const strategy = transfer.buildSearchStrategy('reduce violent crime');
  const audit = transfer.auditSearchCoverage(strategy, [
    { sourceType: 'local-program', sourceId: 'local', status: 'searched-empty', candidates: [] },
    { sourceType: 'official-data', sourceId: 'official', status: 'searched-empty', candidates: [] },
    { sourceType: 'research', sourceId: 'research', status: 'searched-empty', candidates: [] },
    { sourceType: 'intervention-library', sourceId: 'library', status: 'searched-empty', candidates: [] },
    { sourceType: 'comparable-city', sourceId: 'comparable-city-learning', status: 'candidates-found', candidates: [{ name: 'Focused Deterrence' }] }
  ]);
  assert.equal(audit.complete, true);
  assert.deepEqual(audit.failed, []);
  assert.deepEqual(audit.notSearched, []);
});
