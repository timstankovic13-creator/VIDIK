'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const I = require('../js/discovery-transfer-intelligence');

test('1. discovery strategy expands an arbitrary problem into multiple search families', () => {
  const strategy = I.buildSearchStrategy('reduce rural ambulance response times', {
    domains: ['emergency medical services'],
    objectives: ['response time'],
    synonyms: ['EMS', 'paramedic response'],
    jurisdiction: 'Ontario'
  });
  assert.equal(strategy.requiredSourceTypes.length, 5);
  assert.ok(strategy.queries.some(q => q.purpose === 'intervention-discovery'));
  assert.ok(strategy.queries.some(q => q.purpose === 'research-evidence'));
  assert.ok(strategy.queries.some(q => q.purpose === 'comparable-cities'));
  assert.equal(typeof strategy.strategyHash, 'string');
});

test('2. candidate universe discovers, deduplicates and preserves provenance', () => {
  const universe = I.buildCandidateUniverse([
    { sourceId: 'local', sourceType: 'local-program', jurisdiction: 'Ottawa', candidates: [{ id: 'a', name: 'Community Paramedicine', problemTags: ['response times'] }] },
    { sourceId: 'research', sourceType: 'research', jurisdiction: 'Canada', candidates: [{ id: 'b', name: 'Community Paramedicine', problemTags: ['response times'] }] },
    { sourceId: 'library', sourceType: 'intervention-library', jurisdiction: null, candidates: [{ id: 'c', name: 'Mobile EMS Unit', problemTags: ['response times'] }] }
  ]);
  assert.equal(universe.candidates.length, 2);
  const paramedicine = universe.candidates.find(c => c.name === 'Community Paramedicine');
  assert.equal(paramedicine.provenance.length, 2);
  assert.equal(new Set(paramedicine.provenance.map(p => p.sourceType)).size, 2);
  assert.equal(universe.candidateUniverseHash, I.hash(universe.candidates));
});

test('3. discovery audit records missing and failed searches instead of hiding them', () => {
  const strategy = I.buildSearchStrategy('reduce water loss');
  const audit = I.auditSearchCoverage(strategy, [
    { sourceType: 'local-program', sourceId: 'city', status: 'candidates-found', candidates: [{}] },
    { sourceType: 'research', sourceId: 'papers', status: 'searched-empty', candidates: [] },
    { sourceType: 'official-data', sourceId: 'open-data', status: 'failed', failureReason: 'timeout', candidates: [] },
    { sourceType: 'intervention-library', sourceId: 'library', status: 'searched-empty', candidates: [] }
  ]);
  assert.equal(audit.complete, false);
  assert.deepEqual(audit.failed, ['official-data']);
  assert.deepEqual(audit.notSearched, ['comparable-city']);
});

test('4. evidence and ranking gates refuse unsupported candidates', () => {
  const candidate = { id: 'a', name: 'Speed Management', requiredEvidence: ['causal', 'implementation'] };
  const incomplete = I.evidenceGate(candidate, { causal: { status: 'verified' }, implementation: { status: 'unknown' } });
  assert.equal(incomplete.complete, false);
  const ranked = I.rankCandidates([candidate, { id: 'b', name: 'Supported Option', requiredEvidence: ['causal'] }], {
    a: { causal: { status: 'verified' }, implementation: { status: 'unknown' } },
    b: { causal: { status: 'verified' } }
  }, { a: { evidenceScore: 99, benefit: 99 }, b: { evidenceScore: 4, benefit: 4 } });
  assert.equal(ranked.find(x => x.candidateId === 'a').score, null);
  assert.equal(ranked.find(x => x.candidateId === 'b').recommendationEligible, true);
});

test('5. comparable-city ideas remain transfer leads and require local validation', () => {
  const universe = I.buildCandidateUniverse([], [{ city: 'Toronto', jurisdiction: 'Ontario', problemTags: ['pedestrian deaths'], interventions: ['School-zone speed management'] }]);
  assert.equal(universe.candidates[0].leadOnly, true);
  assert.equal(universe.candidates[0].effectsImported, false);
  const transfer = I.assessTransferability({ problem: 'pedestrian deaths', population: 'large urban', jurisdiction: 'Ontario', institutionalCapacity: 'high', implementationEnvironment: 'urban', evidenceBase: 'study' }, {
    problem: 'pedestrian deaths', population: 'large urban', jurisdiction: 'Quebec', institutionalCapacity: 'high', implementationEnvironment: 'urban', evidenceBase: 'study'
  });
  assert.equal(transfer.classification, 'requires-local-validation');
  assert.equal(transfer.causalEffectTransferred, false);
});

test('6. why/why-not and robustness expose what could change the decision', () => {
  const ranked = [
    { candidateId: 'a', name: 'A', recommendationEligible: true, evidenceComplete: true, score: 10 },
    { candidateId: 'b', name: 'B', recommendationEligible: true, evidenceComplete: true, score: 8 },
    { candidateId: 'c', name: 'C', recommendationEligible: false, evidenceComplete: false, score: null }
  ];
  const why = I.whyNot(ranked, { explicit: true });
  assert.equal(why.winner, 'a');
  assert.ok(why.alternatives.some(x => x.candidateId === 'b'));
  assert.equal(why.statusQuo.compared, true);
  const robust = I.robustnessGate({ baselineWinner: 'a', uncertaintyWinners: ['a'], scenarios: [{ winner: 'a' }], voiStatus: 'complete', statusQuoExplicit: true });
  assert.equal(robust.stable, true);
  const flips = I.robustnessGate({ baselineWinner: 'a', uncertaintyWinners: ['b'], scenarios: [], voiStatus: 'complete', statusQuoExplicit: true });
  assert.equal(flips.stable, false);
  assert.ok(flips.recommendationBlockedReasons.includes('recommendation-flips-under-sensitivity'));
});

test('7. learning records outcomes without rewriting history or mutating parameters automatically', () => {
  const decision = { decisionId: 'decision-1', baselineHash: 'baseline-abc', recommendation: 'a' };
  const record = I.recordOutcome(decision, { predicted: 10, observed: 13, observedAt: '2026-09-13' });
  assert.equal(record.baselineDecisionHash, 'baseline-abc');
  assert.equal(record.deviation, 3);
  assert.equal(record.historyRewrite, false);
  assert.equal(record.automaticParameterMutation, false);
  const recalibration = I.proposeRecalibration([record], { threshold: 1 });
  assert.equal(recalibration.status, 'recalibration-review-required');
  assert.equal(recalibration.automaticMutation, false);
  assert.equal(recalibration.historyRewrite, false);
});

test('integrated intelligence object exposes strategy, universe, transfer, why-not and learning controls', () => {
  const result = I.buildDecisionIntelligence({
    problem: 'reduce pedestrian deaths',
    sourceResults: [
      { sourceType: 'local-program', sourceId: 'city', candidates: [{ id: 'a', name: 'Speed Management', problemTags: ['pedestrian deaths'] }] },
      { sourceType: 'research', sourceId: 'research', candidates: [{ id: 'a2', name: 'Speed Management', problemTags: ['pedestrian deaths'] }] },
      { sourceType: 'official-data', sourceId: 'data', candidates: [] },
      { sourceType: 'intervention-library', sourceId: 'library', candidates: [] }
    ],
    comparableCities: [{ city: 'Toronto', problemTags: ['pedestrian deaths'], interventions: ['Vision Zero'] }],
    evidenceIndex: { a: { causal: { status: 'verified' }, implementation: { status: 'verified' } } },
    analysis: { a: { evidenceScore: 5, feasibility: 3, benefit: 4 } },
    statusQuo: { explicit: true }
  });
  assert.ok(result.strategy.queries.length >= 4);
  assert.ok(result.discovery.universe.candidateUniverseHash);
  assert.equal(result.governance.unknownIsNotZero, true);
  assert.equal(result.governance.comparableEffectsImported, false);
  assert.equal(result.governance.learning.automaticParameterMutation, false);
});

test('9. comparable-city discovery uses controlled semantic concepts when city wording differs from the problem', () => {
  const leads = I.comparableCityDiscoveryLeads('How should a municipality allocate $10M to reduce violent crime?', [
    {
      city: 'Glasgow',
      jurisdiction: 'Scotland, UK',
      problemTags: ['group violence'],
      matchedSignals: ['neighborhood safety'],
      strategies: [{ name: 'Violence Reduction Partnership', description: 'Multi-agency violence reduction strategy.' }]
    }
  ]);
  assert.equal(leads.length, 1);
  assert.equal(leads[0].name, 'Violence Reduction Partnership');
  assert.equal(leads[0].leadOnly, true);
  assert.equal(leads[0].effectsImported, false);
});

test('8. comparable-city discovery expands beyond the legacy interventions field and preserves lead-only boundaries', () => {
  const leads = I.comparableCityDiscoveryLeads('reduce violent crime', [
    {
      city: 'Toronto',
      jurisdiction: 'Ontario',
      problemTags: ['violent crime'],
      programs: [
        { name: 'Community violence interruption', description: 'Neighbourhood violence prevention program' }
      ],
      strategies: ['Focused deterrence']
    },
    {
      city: 'Melbourne',
      jurisdiction: 'Victoria',
      problemTags: ['road safety'],
      programs: ['Unrelated road program']
    }
  ]);
  assert.equal(leads.length, 2);
  assert.ok(leads.some(lead => lead.name === 'Community violence interruption'));
  assert.ok(leads.some(lead => lead.name === 'Focused deterrence'));
  assert.ok(leads.every(lead => lead.discoveryRoute === 'comparable-city'));
  assert.ok(leads.every(lead => lead.leadOnly === true));
  assert.ok(leads.every(lead => lead.effectsImported === false));

  const universe = I.buildCandidateUniverse([
    { sourceType: 'local-program', sourceId: 'local', candidates: [{ id: 'local-1', name: 'Community violence interruption', problemTags: ['violent crime'] }] }
  ], [
    { city: 'Toronto', problemTags: ['violent crime'], programs: ['Community violence interruption', 'Focused deterrence'] }
  ], 'reduce violent crime');

  assert.equal(universe.candidates.length, 2);
  const focused = universe.candidates.find(candidate => candidate.name === 'Focused deterrence');
  assert.ok(focused);
  assert.equal(focused.discovery.sourceType, 'comparable-city');
  assert.equal(focused.discovery.effectsImported, false);
  assert.equal(focused.discovery.leadOnly, true);
  const shared = universe.candidates.find(candidate => candidate.name === 'Community violence interruption');
  assert.equal(shared.provenance.length, 2);
});


test('generic comparable-city normalization accepts arbitrary structured records and preserves transfer context', () => {
  const normalized = I.normalizeComparableCityRecord({
    city: 'Example City',
    jurisdiction: 'Example Region',
    problemTags: ['group violence'],
    strategies: [{ name: 'Violence Reduction Partnership', description: 'Multi-agency prevention strategy' }],
    transferability: { problem: 'group violence', population: 'urban', institutionalCapacity: 'multi-agency' }
  });
  assert.equal(normalized.city, 'Example City');
  assert.equal(normalized.interventions.length, 1);
  assert.equal(normalized.leadOnly, true);
  assert.equal(normalized.effectsImported, false);
  assert.deepEqual(normalized.transferability, { problem: 'group violence', population: 'urban', institutionalCapacity: 'multi-agency' });
});

test('comparable-city channel can supply the candidate universe when ordinary sources are empty', () => {
  const problem = 'How should a municipality reduce serious violence?';
  const result = I.buildDecisionIntelligence({
    problem,
    context: { jurisdiction: 'Target City' },
    sourceResults: [
      { sourceType: 'local-program', sourceId: 'local', status: 'searched-empty', candidates: [] },
      { sourceType: 'official-data', sourceId: 'official', status: 'searched-empty', candidates: [] },
      { sourceType: 'research', sourceId: 'research', status: 'searched-empty', candidates: [] },
      { sourceType: 'intervention-library', sourceId: 'library', status: 'searched-empty', candidates: [] }
    ],
    comparableCities: [{
      city: 'Example City',
      jurisdiction: 'Example Region',
      problemTags: ['group violence'],
      strategies: [{ name: 'Violence Reduction Partnership', description: 'Multi-agency violence prevention' }],
      transferability: { problem: 'group violence', population: 'urban' }
    }],
    statusQuo: { explicit: true }
  });
  assert.ok(result.discovery.universe.candidates.length >= 1);
  const lead = result.discovery.universe.candidates[0];
  assert.equal(lead.discovery.sourceType, 'comparable-city');
  assert.equal(lead.discovery.leadOnly, true);
  assert.equal(lead.discovery.effectsImported, false);
  assert.equal(result.discovery.transferLeads.length, 1);
  assert.equal(result.discovery.transferLeads[0].transferability.effectsImported, false);
  assert.equal(result.discovery.transferLeads[0].transferability.causalEffectTransferred, false);
  assert.equal(result.whyNot.winner, null);
});
