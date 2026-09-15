'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { executeDecisionDiscovery } = require('../js/decision-discovery-execution');
const { SOURCE_TYPES } = require('../js/decision-discovery-orchestrator');
const { buildDecisionAnalysisInputs } = require('../js/decision-quantification');
const { PRODUCTION_HOUSING_EVIDENCE } = require('../evidence/production-housing-evidence');
const { runRealEvidenceAll } = require('../scripts/real-three-city-evidence-run');

function causal(estimate, sourceId, unit = 'percentage-point stable-housing outcome') {
  return { verified: true, evidenceType: 'causal', estimate, unit, uncertainty: { low: estimate * 0.8, high: estimate * 1.2 }, sourceId, provenance: { sourceId, externalId: `${sourceId}-record` }, transportability: { admissible: true } };
}
function marginal(id, amount, outcome, evidenceId = `${id}-marginal`) {
  return { intervention: id, resourceUnit: 'CAD', resourceAmount: amount, incrementalCapacity: 10, incrementalActivity: 10, incrementalOutcome: outcome, unit: 'percentage-point stable-housing outcome', evidenceId, evidenceIds: [evidenceId, `${id}-capacity`, `${id}-activity`], provenance: `${id}: independently verified resource -> capacity -> activity -> outcome chain`, uncertainty: { low: outcome * 0.8, high: outcome * 1.2 }, transportability: { admissible: true } };
}

const problems = [
  { problem: 'improve stable housing outcomes for people experiencing homelessness', jurisdiction: 'Toronto, Canada', candidates: [{ id: 'housing-first', name: 'Housing First' }, { id: 'supportive-housing-expansion', name: 'Supportive housing expansion' }, { id: 'shelter-capacity', name: 'Shelter capacity expansion' }, { id: 'rapid-rehousing-pilot', name: 'Rapid rehousing pilot' }, { id: 'housing-dashboard', name: 'Housing dashboard' }], comparableCities: [{ city: 'Vancouver', problem: 'improve stable housing outcomes for people experiencing homelessness', interventions: 'supportive housing' }] },
  { problem: 'reduce pedestrian injuries around high-risk corridors', jurisdiction: 'Ottawa, Canada', candidates: [{ id: 'pedestrian-safety-program', name: 'Pedestrian safety program' }, { id: 'corridor-redesign', name: 'High-risk corridor redesign' }, { id: 'quick-build-pilot', name: 'Quick-build safety pilot' }, { id: 'pedestrian-dashboard', name: 'Pedestrian injury dashboard' }], comparableCities: [{ city: 'Toronto', problem: 'reduce pedestrian injuries around high-risk corridors', interventions: 'road safety redesign' }] },
  { problem: 'reduce extreme heat illness', jurisdiction: 'Ottawa, Canada', candidates: [{ id: 'cooling-centres', name: 'Cooling centre expansion' }, { id: 'heat-alert-outreach', name: 'Heat alert outreach' }, { id: 'reflective-roof-pilot', name: 'Reflective roof pilot' }, { id: 'heat-dashboard', name: 'Heat illness dashboard' }], comparableCities: [{ city: 'Toronto', problem: 'reduce extreme heat illness', interventions: 'cooling centres' }] }
];

const evidenceProfiles = {
  'housing-first': { state: 'fully-quantified', causal: { ...PRODUCTION_HOUSING_EVIDENCE.Toronto, verified: true, sourceId: 'pubmed-27619826', provenance: { sourceId: 'pubmed-27619826', externalId: 'PMID-27619826' } }, marginal: marginal('housing-first', 1000000, 45.8, 'toronto-municipal-resource-chain-verified'), voi: 2.5 },
  'supportive-housing-expansion': { state: 'fully-quantified', causal: causal(30, 'supportive-housing-rct-verified'), marginal: marginal('supportive-housing-expansion', 500000, 30), voi: 1.5 },
  'shelter-capacity': { state: 'causal-supported-resource-incomplete', causal: causal(12, 'shelter-causal-rct-verified') },
  'rapid-rehousing-pilot': { state: 'resource-supported-causal-incomplete', marginal: marginal('rapid-rehousing-pilot', 400000, 8) },
  'housing-dashboard': { state: 'irrelevant-admin-data-false-positive' },
  'pedestrian-safety-program': { state: 'fully-quantified', causal: causal(18, 'pedestrian-safety-causal-verified', 'percentage-point reduction in pedestrian injury rate'), marginal: { ...marginal('pedestrian-safety-program', 750000, 18, 'ottawa-pedestrian-resource-chain-verified'), unit: 'percentage-point reduction in pedestrian injury rate', uncertainty: { low: 12, high: 24 } }, voi: 1.1 },
  'corridor-redesign': { state: 'causal-supported-resource-incomplete', causal: causal(10, 'corridor-redesign-causal-verified', 'percentage-point reduction in pedestrian injury rate') },
  'quick-build-pilot': { state: 'experimental-promising', marginal: { ...marginal('quick-build-pilot', 250000, 5, 'quick-build-resource-observation'), unit: 'percentage-point reduction in pedestrian injury rate', uncertainty: { low: 0, high: 12 }, transportability: { admissible: false } } },
  'pedestrian-dashboard': { state: 'irrelevant-admin-data-false-positive' },
  'cooling-centres': { state: 'resource-supported-causal-incomplete', marginal: { ...marginal('cooling-centres', 300000, 4, 'ottawa-cooling-centre-resource-observation'), unit: 'heat-illness outcome units' } },
  'heat-alert-outreach': { state: 'causal-supported-resource-incomplete', causal: causal(7, 'heat-outreach-causal-verified', 'heat-illness outcome units') },
  'reflective-roof-pilot': { state: 'experimental-promising' },
  'heat-dashboard': { state: 'irrelevant-admin-data-false-positive' }
};

function discoverySearchers(scenario) {
  const admin = scenario.candidates.find(candidate => candidate.id.endsWith('-dashboard'));
  return {
    'local-program': async () => ({ sourceId: `${scenario.jurisdiction}-local-program`, jurisdiction: scenario.jurisdiction, candidates: scenario.candidates.slice(0, 2) }),
    research: async () => ({ sourceId: `${scenario.jurisdiction}-research`, jurisdiction: scenario.jurisdiction, candidates: scenario.candidates.slice(2, 4) }),
    'intervention-library': async () => ({ sourceId: `${scenario.jurisdiction}-library`, jurisdiction: scenario.jurisdiction, candidates: [] }),
    'official-data': async () => ({ sourceId: `${scenario.jurisdiction}-official-data`, jurisdiction: scenario.jurisdiction, candidates: admin ? [admin] : [] })
  };
}

test('real-evidence quantitative campaign preserves mixed evidence states and optimizes only admissible candidates', async () => {
  const seenStates = new Set();
  for (const scenario of problems) {
    const discovered = await executeDecisionDiscovery({ problem: scenario.problem, discoveryJurisdiction: scenario.jurisdiction, requiredSourceTypes: SOURCE_TYPES.filter(type => type !== 'comparable-city'), searchers: discoverySearchers(scenario), comparableCities: scenario.comparableCities, evidenceSearcher: async ({ candidate }) => { const profile = evidenceProfiles[candidate.id]; if (profile) seenStates.add(profile.state); return profile ? { status: 'searched', evidence: { causal: profile.causal, marginalResource: profile.marginal }, sourceIds: [profile.causal?.sourceId, profile.marginal?.evidenceId].filter(Boolean) } : { status: 'searched', evidence: {} }; }, statusQuo: { explicit: true, effect: 0, label: 'status quo' } });

    assert.equal(discovered.governance.recommendationAllowed, false, `${scenario.problem}: discovery alone must not recommend`);
    assert.ok(discovered.candidates.length >= 3, `${scenario.problem}: multiple discovered interventions must survive`);
    assert.ok(discovered.governance.candidateUniverseIntelligence, `${scenario.problem}: candidate-universe audit missing`);
    assert.equal(discovered.comparableCityLeads.length, 1, `${scenario.problem}: comparable-city lead must be preserved separately`);
    assert.equal(discovered.comparableCityLeads[0].leadOnly, true, `${scenario.problem}: comparator must remain lead-only`);
    assert.equal(discovered.comparableCityLeads[0].effectsImported, false, `${scenario.problem}: comparator effects must not be imported`);
    seenStates.add('comparable-city-lead');
    const officialDataSearch = discovered.sourceSearches.find(search => search.sourceType === 'official-data');
    assert.equal(officialDataSearch.candidatesReturned, 1, `${scenario.problem}: administrative-data false positive must be encountered and audited`);
    seenStates.add('irrelevant-admin-data-false-positive');

    const discoveredIds = new Set(discovered.candidates.map(c => c.id));
    const admissibleIds = scenario.candidates.map(c => c.id).filter(id => discoveredIds.has(id) && evidenceProfiles[id]?.state === 'fully-quantified');
    const quantEvidence = Object.fromEntries(admissibleIds.map(id => [id, { causal: evidenceProfiles[id].causal }]));
    const quantResources = Object.fromEntries(admissibleIds.map(id => [id, evidenceProfiles[id].marginal]));
    const quant = buildDecisionAnalysisInputs({ candidates: discovered.candidates.filter(c => evidenceProfiles[c.id]), evidence: quantEvidence, marginalResources: quantResources, voiValues: Object.fromEntries(admissibleIds.map(id => [id, evidenceProfiles[id].voi])), budget: { amount: 1000000, unit: 'CAD' }, statusQuo: { explicit: true, effect: 0 } });

    assert.equal(quant.candidates.length, admissibleIds.length, `${scenario.problem}: only fully quantified candidates may enter optimizer`);
    assert.ok(quant.blocked.length >= scenario.candidates.filter(c => discoveredIds.has(c.id) && evidenceProfiles[c.id]?.state !== 'fully-quantified').length, `${scenario.problem}: incomplete evidence must remain blocked`);
    assert.ok(quant.optimization.candidates.every(c => admissibleIds.includes(c.id)), `${scenario.problem}: non-admissible candidate entered optimizer`);
    assert.ok(quant.status === 'DECISION_QUANTITATIVE_READY' || quant.status === 'QUANTITATIVE_READY_VOI_OR_GATE_REQUIRED', `${scenario.problem}: unexpected quantitative status ${quant.status}`);
  }
  for (const state of ['fully-quantified', 'causal-supported-resource-incomplete', 'resource-supported-causal-incomplete', 'experimental-promising', 'comparable-city-lead', 'irrelevant-admin-data-false-positive']) assert.ok(seenStates.has(state), `campaign never exercised ${state}`);
});

test('real Toronto causal evidence and live municipal three-city evidence remain part of the campaign', async () => {
  const result = await runRealEvidenceAll();
  assert.equal(result.acceptance.realMunicipalSourceRequired, true);
  assert.equal(result.acceptance.realCausalEvidenceRequired, true);
  assert.equal(result.acceptance.syntheticEvidenceExcluded, true);
  assert.equal(result.cities.length, 3);
  for (const city of ['Ottawa', 'Toronto', 'Melbourne']) {
    const decision = result.cities.find(item => item.identityBrief.city === city);
    assert.ok(decision, `${city}: real municipal decision result missing`);
    assert.equal(decision.integrity.syntheticEvidenceExcluded, true);
    assert.equal(decision.integrity.decisionIntegrity, true);
    assert.ok(decision.evidenceGraph.nodes.some(node => node.kind === 'causal_effect'), `${city}: causal evidence node missing`);
    assert.ok(decision.evidenceGraph.nodes.some(node => node.provenance?.sourceUrlUsed), `${city}: live municipal provenance missing`);
  }
  assert.equal(result.evidenceRegistry.Toronto.estimate, PRODUCTION_HOUSING_EVIDENCE.Toronto.estimate);
});

console.log('Real evidence -> quantitative decision campaign: mixed-state and real-municipal gates defined.');
