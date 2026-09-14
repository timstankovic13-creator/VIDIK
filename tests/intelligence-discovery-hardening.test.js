'use strict';

const assert = require('assert');
const {
  FAMILIES, buildUniverseAudit, planEvidence, causalGraph, transferability, allocate
} = require('../src/full-scope/intelligence-hardening');

const expectBlocked = (fn, message) => {
  const value = fn();
  assert.equal(value.recommendationAllowed, false, message);
};

// 1. A candidate with no declared family must not be silently classified as coordination.
{
  const u = buildUniverseAudit('reduce violent crime', [{id:'x',name:'Unclassified intervention',sourceId:'s1'}]);
  assert.deepEqual(u.unclassified, ['x']);
  assert.equal(u.searchRequired, true);
  assert.ok(u.missingFamilies.length >= 1);
}

// 2. Duplicate candidates from different sources must merge provenance and family knowledge.
{
  const u = buildUniverseAudit('reduce opioid mortality', [
    {id:'a',name:'Medication treatment',families:['clinical'],sourceId:'source-a'},
    {id:'b',name:'Medication treatment',families:['direct-service'],sourceId:'source-b'}
  ]);
  assert.equal(u.candidateCount, 1);
  assert.deepEqual(u.candidates[0].sourceIds.sort(), ['source-a','source-b']);
  assert.ok(u.candidates[0].families.includes('clinical'));
  assert.ok(u.candidates[0].families.includes('direct-service'));
}

// 3. Malformed candidates, effect-bearing discovery records and non-objects cannot create authority.
{
  const u = buildUniverseAudit('flood risk', [null, {}, {id:'x',name:'Barrier',families:['infrastructure'],effect:999,verified:true}]);
  assert.equal(u.candidateCount, 1);
  assert.equal(u.candidates[0].effectsImported, false);
  assert.equal(u.recommendationAllowed, false);
}

// 4. Candidate-universe coverage must not claim completeness merely because one candidate exists.
{
  const u = buildUniverseAudit('housing instability', [{id:'x',name:'Rent support',families:['economic'],sourceId:'s'}]);
  assert.equal(u.completeness.candidateCount, 1);
  assert.ok(u.completeness.familyCoverageRate < 1);
  assert.equal(u.searchRequired, true);
}

// 5. Evidence: supported is insufficient for causal evidence; causal must be independently verified.
{
  const u = buildUniverseAudit('traffic fatalities', [{id:'x',name:'Road redesign',families:['infrastructure'],sourceId:'s'}]);
  const p = planEvidence(u, [{id:'e1',evidenceTypes:['causal','implementation'],authority:10,independenceGroup:'g1'}], {
    x:{causal:{status:'supported'},implementation:{status:'supported'},cost:{status:'supported'},equity:{status:'supported'}}
  });
  assert.deepEqual(p.candidatePlans[0].missing, ['causal']);
  assert.equal(p.candidatePlans[0].status, 'acquisition-required');
  assert.equal(p.candidatePlans[0].recommendationEligible, false);
}

// 6. Missing source registry must remain an acquisition gap, not zero evidence.
{
  const u = buildUniverseAudit('heat deaths', [{id:'x',name:'Cooling centre',families:['direct-service'],sourceId:'s'}]);
  const p = planEvidence(u, [], {});
  assert.equal(p.blockedCount, 1);
  assert.equal(p.candidatePlans[0].status, 'acquisition-required');
  assert.equal(p.candidatePlans[0].independentSourceGroupsAvailable, 0);
}

// 7. Two URLs from the same evidence family do not count as independent causal evidence.
{
  const g = causalGraph({id:'x'}, [
    {sourceId:'s1',independenceGroup:'publisher-a',causalMethod:'quasi-experimental',verification:{status:'verified'},effect:1,effectUnit:'cases',outcome:'cases'},
    {sourceId:'s2',independenceGroup:'publisher-a',causalMethod:'difference-in-differences',verification:{status:'verified'},effect:2,effectUnit:'cases',outcome:'cases'}
  ]);
  assert.equal(g.independentSourceGroups.length, 1);
  assert.equal(g.causalReady, false);
}

// 8. Same source group plus an unverified source cannot unlock causality.
{
  const g = causalGraph({id:'x'}, [
    {sourceId:'s1',independenceGroup:'a',causalMethod:'randomized-trial',verification:{status:'verified'},effect:1,effectUnit:'rate'},
    {sourceId:'s2',independenceGroup:'b',causalMethod:'randomized-trial',verification:{status:'pending'},effect:1,effectUnit:'rate'}
  ]);
  assert.equal(g.causalReady, false);
  assert.ok(g.rejected.some(x=>x.reason==='independent-verification-missing'));
}

// 9. Non-finite effect and missing independence metadata fail closed.
{
  const g = causalGraph({id:'x'}, [
    {sourceId:'s1',causalMethod:'randomized-trial',verification:{status:'verified'},effect:Infinity,effectUnit:'rate'},
    {sourceId:'s2',independenceGroup:'b',causalMethod:'randomized-trial',verification:{status:'verified'},effect:1,effectUnit:'rate'}
  ]);
  assert.equal(g.causalReady, false);
  assert.ok(g.rejected.some(x=>x.reason==='independence-group-missing'));
}

// 10. Missing transfer dimensions must not be converted into similarity.
{
  const t = transferability({population:100000,legalEnvironment:'CA'}, {population:100000,legalEnvironment:'CA'});
  assert.equal(t.score, 1);
  assert.equal(t.missingDimensions.length, 7);
  assert.equal(t.requiresLocalValidation, true);
}

// 11. Cross-legal-system mismatch is a hard transfer blocker even if everything else matches.
{
  const t = transferability({population:100000,legalEnvironment:'CA',density:100}, {population:100000,legalEnvironment:'US',density:100});
  assert.equal(t.hardMismatch, true);
  assert.equal(t.band, 'insufficient');
  assert.equal(t.effectTransferAllowed, false);
}

// 12. Non-finite transfer inputs cannot produce a high-confidence transfer.
{
  const t = transferability({population:Infinity}, {population:Infinity});
  assert.notEqual(t.band, 'high');
  assert.equal(t.effectTransferAllowed, false);
}

// 13. Allocation must reject incomparable effect units before optimization.
{
  const a = allocate([
    {id:'a',effectUnit:'deaths',resourceUnit:'dollars',maxResource:100,effectAtMax:5},
    {id:'b',effectUnit:'incidents',resourceUnit:'dollars',maxResource:100,effectAtMax:7}
  ], 100);
  assert.equal(a.blockedReason, 'incomparable-or-missing-units');
  assert.equal(a.selected.length, 0);
}

// 14. Fixed costs must consume the budget; they cannot disappear from the model.
{
  const a = allocate([{id:'a',effectUnit:'cases',resourceUnit:'dollars',maxResource:100,step:10,fixedCost:60,effectAtMax:10}], 100);
  assert.equal(a.selected.length, 1);
  assert.ok(a.selected[0].fixedCost === 60);
  assert.equal(a.remainingBudget, 30);
}

// 15. Negative, zero and non-finite candidate resources/effects cannot become selected.
{
  const a = allocate([
    {id:'bad1',effectUnit:'cases',resourceUnit:'dollars',maxResource:-10,effectAtMax:5},
    {id:'bad2',effectUnit:'cases',resourceUnit:'dollars',maxResource:10,effectAtMax:0},
    {id:'bad3',effectUnit:'cases',resourceUnit:'dollars',maxResource:10,effectAtMax:Infinity},
    {id:'good',effectUnit:'cases',resourceUnit:'dollars',maxResource:10,step:5,effectAtMax:5}
  ], 5);
  assert.deepEqual(a.selected.map(x=>x.candidateId), ['good']);
}

// 16. Every output remains explicitly non-authoritative until the existing decision gates accept it.
{
  const u=buildUniverseAudit('employment', [{id:'x',name:'Wage subsidy',families:['economic']}]);
  const p=planEvidence(u, [{id:'s',evidenceTypes:['all'],independenceGroup:'s'}], {});
  const g=causalGraph({id:'x'}, []);
  const t=transferability({}, {});
  const a=allocate([{id:'x',effectUnit:'cases',resourceUnit:'dollars',maxResource:1,effectAtMax:1}],1);
  [u,p,g,t,a].forEach(x=>assert.equal(x.recommendationAllowed,false));
}

console.log(`intelligence discovery hardening: ${FAMILIES.length} intervention families attacked; 16 adversarial scenarios passed`);
