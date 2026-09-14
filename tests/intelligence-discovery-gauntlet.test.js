'use strict';

const assert = require('assert');
const m = require('../src/full-scope/intelligence-hardening');

const run = (name, fn) => {
  try { fn(); console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}: ${error.message}`); throw error; }
};

run('unknown candidate provenance forces reacquisition', () => {
  const u = m.buildUniverseAudit('novel problem', [{id:'x',name:'Unknown intervention',families:['policy']}]);
  assert.deepEqual(u.provenanceGaps, ['x']);
  assert.equal(u.completeness.provenanceCoverageRate, 0);
  assert.equal(u.searchRequired, true);
});

run('duplicate names preserve every provenance dimension', () => {
  const u = m.buildUniverseAudit('novel problem', [
    {id:'a',name:'Shared intervention',families:['policy'],domains:['city'],sourceId:'s1'},
    {id:'b',name:'shared intervention',families:['coordination'],domains:['health'],sourceId:'s2'}
  ]);
  assert.equal(u.candidateCount, 1);
  assert.deepEqual(u.candidates[0].sourceIds.sort(), ['s1','s2']);
  assert.deepEqual(u.candidates[0].families.sort(), ['coordination','policy']);
  assert.deepEqual(u.candidates[0].domains.sort(), ['city','health']);
});

run('malicious effect fields cannot enter discovery authority', () => {
  const u = m.buildUniverseAudit('novel problem', [{id:'x',name:'Attack',families:['enforcement'],effect:999,effectEstimate:999,verified:true,parameter:{effect:999}}]);
  const c = u.candidates[0];
  assert.equal(c.effectsImported, false);
  assert.equal(c.causalEffectImported, false);
  assert.equal(c.evidenceStatus, 'potential');
  assert.equal(u.recommendationAllowed, false);
});

run('family coverage cannot be forged by invalid family labels', () => {
  const u = m.buildUniverseAudit('novel problem', [{id:'x',name:'Fake',families:['magic','not-a-family']}], ['policy']);
  assert.deepEqual(u.missingFamilies, ['policy']);
  assert.equal(u.candidates[0].families.length, 0);
  assert.deepEqual(u.unclassified, ['x']);
  assert.equal(u.searchRequired, true);
});

run('evidence-ready requires source provenance, not status strings alone', () => {
  const u = m.buildUniverseAudit('novel problem', [{id:'x',name:'Intervention',families:['policy'],sourceId:'lead'}]);
  const evidence = {x:{causal:{status:'verified'},implementation:{status:'verified'},cost:{status:'verified'},equity:{status:'verified'}}};
  const p = m.planEvidence(u, [{id:'registry',evidenceTypes:['all'],independenceGroup:'g'}], evidence);
  assert.deepEqual(p.candidatePlans[0].provenanceMissing.sort(), ['causal','cost','equity','implementation']);
  assert.equal(p.candidatePlans[0].status, 'acquisition-required');
  assert.equal(p.blockedCount, 1);
});

run('evidence acquisition records independence groups rather than counting rows', () => {
  const u = m.buildUniverseAudit('novel problem', [{id:'x',name:'Intervention',families:['policy'],sourceId:'lead'}]);
  const p = m.planEvidence(u, [
    {id:'s1',evidenceTypes:['causal'],independenceGroup:'same'},
    {id:'s2',evidenceTypes:['causal'],independenceGroup:'same'},
    {id:'s3',evidenceTypes:['cost'],independenceGroup:'other'}
  ], {});
  assert.equal(p.candidatePlans[0].independentSourceGroupsAvailable, 2);
  assert.deepEqual(p.candidatePlans[0].causalSourceGroups, ['same']);
});

run('same source cannot manufacture independence by changing its group', () => {
  const g = m.causalGraph({id:'x'}, [
    {sourceId:'s',independenceGroup:'a',causalMethod:'randomized-trial',verification:{status:'verified'},effect:1,effectUnit:'rate'},
    {sourceId:'s',independenceGroup:'b',causalMethod:'difference-in-differences',verification:{status:'verified'},effect:2,effectUnit:'rate'},
    {sourceId:'other',independenceGroup:'b',causalMethod:'difference-in-differences',verification:{status:'verified'},effect:2,effectUnit:'rate'}
  ]);
  assert(g.rejected.some(x=>x.reason==='source-independence-conflict'));
  assert.deepEqual(g.independentSourceGroups, ['a','b']);
  assert.equal(g.sourceIds.length, 2);
});

run('duplicate source rows cannot inflate evidence count', () => {
  const g = m.causalGraph({id:'x'}, [
    {sourceId:'s',independenceGroup:'a',causalMethod:'randomized-trial',verification:{status:'verified'},effect:1,effectUnit:'rate'},
    {sourceId:'s',independenceGroup:'a',causalMethod:'randomized-trial',verification:{status:'verified'},effect:1,effectUnit:'rate'},
    {sourceId:'t',independenceGroup:'a',causalMethod:'randomized-trial',verification:{status:'verified'},effect:1,effectUnit:'rate'}
  ]);
  assert(g.rejected.some(x=>x.reason==='duplicate-source'));
  assert.equal(g.causalReady, false);
});

run('mixed causal units cannot create one causal parameter', () => {
  const g = m.causalGraph({id:'x'}, [
    {sourceId:'s1',independenceGroup:'a',causalMethod:'randomized-trial',verification:{status:'verified'},effect:1,effectUnit:'cases'},
    {sourceId:'s2',independenceGroup:'b',causalMethod:'difference-in-differences',verification:{status:'verified'},effect:2,effectUnit:'rate'}
  ]);
  assert.equal(g.causalReady, false);
  assert.deepEqual(g.effectUnits.sort(), ['cases','rate']);
});

run('nonfinite causal values fail before graph admission', () => {
  const g = m.causalGraph({id:'x'}, [
    {sourceId:'s1',independenceGroup:'a',causalMethod:'randomized-trial',verification:{status:'verified'},effect:NaN,effectUnit:'rate'},
    {sourceId:'s2',independenceGroup:'b',causalMethod:'difference-in-differences',verification:{status:'verified'},effect:Infinity,effectUnit:'rate'}
  ]);
  assert.equal(g.accepted.length, 0);
  assert.equal(g.causalReady, false);
  assert.equal(g.rejected.filter(x=>x.reason==='nonfinite-effect').length, 2);
});

run('legal mismatch dominates otherwise perfect transferability', () => {
  const target={population:100000,density:50,baselineRate:10,serviceCapacity:20,legalEnvironment:'CA',implementationModel:'public',geography:'urban',climate:'cold',institutionalStructure:'municipal'};
  const source={...target,legalEnvironment:'US'};
  const t=m.transferability(target,source);
  assert.equal(t.hardMismatch,true);
  assert.equal(t.band,'insufficient');
  assert.equal(t.recommendationAllowed,false);
});

run('nonfinite transfer dimensions are never comparable', () => {
  const target={population:Infinity,legalEnvironment:'CA'};
  const source={population:Infinity,legalEnvironment:'CA'};
  const t=m.transferability(target,source);
  assert.equal(t.score,1);
  assert.notEqual(t.band,'high');
  assert(t.invalidDimensions.includes('population'));
  assert(t.missingDimensions.includes('population'));
});

run('string coercion cannot turn numeric pathology into a match', () => {
  const t=m.transferability({population:NaN},{population:'NaN',legalEnvironment:'CA'},{weights:{population:100,legalEnvironment:1}});
  assert.equal(t.breakdown.find(x=>x.dimension==='population').similarity,null);
  assert(t.invalidDimensions.includes('population'));
  assert.notEqual(t.band,'high');
});

run('allocation exposes that greedy selection is not proof of optimum', () => {
  const a=m.allocate([
    {id:'first',effectUnit:'cases',resourceUnit:'dollars',maxResource:100,step:100,effectAtMax:50},
    {id:'second',effectUnit:'cases',resourceUnit:'dollars',maxResource:100,step:100,effectAtMax:90}
  ],100);
  assert.deepEqual(a.selected.map(x=>x.candidateId), ['first']);
  assert.equal(a.optimality,'heuristic');
  assert.equal(a.optimalityGuaranteed,false);
});

run('allocation never silently treats an invalid effect as usable', () => {
  const a=m.allocate([
    {id:'bad',effectUnit:'cases',resourceUnit:'dollars',maxResource:10,effectAtMax:Infinity},
    {id:'good',effectUnit:'cases',resourceUnit:'dollars',maxResource:10,step:10,effectAtMax:5}
  ],10);
  assert.deepEqual(a.selected.map(x=>x.candidateId), ['good']);
});

run('fixed costs cannot exceed the budget', () => {
  const a=m.allocate([{id:'x',effectUnit:'cases',resourceUnit:'dollars',maxResource:10,step:1,fixedCost:11,effectAtMax:5}],10);
  assert.deepEqual(a.selected, []);
  assert.equal(a.remainingBudget,10);
});

run('all intelligence layers retain explicit authority boundaries', () => {
  const u=m.buildUniverseAudit('novel problem',[{id:'x',name:'X',families:['policy'],sourceId:'s'}]);
  const p=m.planEvidence(u,[],{});
  const g=m.causalGraph({id:'x'},[]);
  const t=m.transferability({},{});
  const a=m.allocate([{id:'x',effectUnit:'cases',resourceUnit:'dollars',maxResource:1,effectAtMax:1}],1);
  for(const value of [u,p,g,t,a]) assert.equal(value.recommendationAllowed,false);
});

run('audit hash changes when provenance changes', () => {
  const a=m.buildUniverseAudit('novel problem',[{id:'x',name:'X',families:['policy'],sourceId:'s1'}]);
  const b=m.buildUniverseAudit('novel problem',[{id:'x',name:'X',families:['policy'],sourceId:'s2'}]);
  assert.notEqual(a.auditHash,b.auditHash);
});

run('empty or non-array discovery input remains fail-closed', () => {
  const a=m.buildUniverseAudit('novel problem',null);
  const b=m.buildUniverseAudit('novel problem','not-an-array');
  assert.equal(a.candidateCount,0);
  assert.equal(b.candidateCount,0);
  assert.equal(a.searchRequired,true);
  assert.equal(b.searchRequired,true);
});

run('malformed expected family lists cannot authorize completeness', () => {
  const u=m.buildUniverseAudit('novel problem',[{id:'x',name:'X',families:['policy'],sourceId:'s'}],['policy','invalid']);
  assert.deepEqual(u.missingFamilies,[]);
  assert.equal(u.completeness.familyCoverageRate,1);
  assert.equal(u.searchRequired,false);
  assert.equal(u.recommendationAllowed,false);
});

console.log('INTELLIGENCE DISCOVERY GAUNTLET: 20/20 PASS');
