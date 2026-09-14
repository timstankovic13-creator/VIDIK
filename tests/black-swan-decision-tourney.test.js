'use strict';

const assert = require('assert');
const { buildInterventionUniverse, planEvidenceAcquisition, buildCausalEvidenceGraph, scoreTransferability, optimizeResourceAllocation } = require('../src/full-scope/intelligence-foundation');
const { recommendationGate } = require('../src/full-scope/decision-engine');
const { optimize } = require('../src/full-scope/optimizer');
const { buildStatusQuo } = require('../src/full-scope/decision-engine');

const scenarios = [
  ['violent crime',['public-safety','health']], ['opioid mortality',['health','housing']], ['homelessness',['housing','health']],
  ['flood risk',['environment','infrastructure']], ['wildfire exposure',['environment','emergency']], ['traffic fatalities',['transport','public-safety']],
  ['emergency department overcrowding',['health','system']], ['youth unemployment',['employment','education']], ['school absenteeism',['education','health']],
  ['housing affordability',['housing','economic']], ['transit reliability',['transport','infrastructure']], ['air pollution',['environment','health']]
];

function candidate(id, name, domains, sourceId, extra={}) {
  return {id,name,domains,sourceId,description:extra.description || `${name} intervention addressing the target problem`,problemTags:extra.problemTags || [], families:extra.families || []};
}

for (const [problem, domains] of scenarios) {
  const candidates = [
    candidate(`${problem}-service`, `${problem} direct service`, domains, 'government-a'),
    candidate(`${problem}-infrastructure`, `${problem} infrastructure redesign`, domains, 'government-b'),
    candidate(`${problem}-economic`, `${problem} economic support`, domains, 'research-a'),
    candidate(`${problem}-policy`, `${problem} policy and coordination`, domains, 'research-b')
  ];
  const universe = buildInterventionUniverse(`Reduce ${problem}`, {candidates});
  assert.strictEqual(universe.recommendationAllowed, false, `${problem}: discovery cannot recommend`);
  assert.strictEqual(universe.effectsImported, false, `${problem}: no effects imported`);
  assert.ok(universe.auditHash.length === 64, `${problem}: universe must be auditable`);

  const plan = planEvidenceAcquisition(universe, {sourceRegistry:[
    {id:'government-a',evidenceTypes:['implementation','cost'],authority:.9,independenceGroup:'gov-a'},
    {id:'research-a',evidenceTypes:['causal','equity'],authority:.9,independenceGroup:'research-a'},
    {id:'research-b',evidenceTypes:['causal','equity'],authority:.8,independenceGroup:'research-b'}
  ]});
  assert.ok(plan.blockedCount === universe.candidateCount, `${problem}: no unsupported candidate becomes decision-ready`);

  const graph = buildCausalEvidenceGraph({id:candidates[0].id,problem}, [
    {sourceId:'research-a',causalMethod:'difference-in-differences',effect:.2,effectUnit:'outcomes/1000',verified:true},
    {sourceId:'research-b',causalMethod:'systematic-review',effect:.15,effectUnit:'outcomes/1000',verified:true}
  ]);
  assert.ok(graph.causalReady, `${problem}: independent causal evidence should be representable`);
  assert.strictEqual(graph.effectImportAllowed, false, `${problem}: graph cannot authorize effect import`);

  const allocation = optimizeResourceAllocation([
    {id:'a',effectUnit:'outcomes',resourceUnit:'dollars',maxResource:100,step:10,effectAtMax:20},
    {id:'b',effectUnit:'outcomes',resourceUnit:'dollars',maxResource:100,step:10,effectAtMax:18}
  ], 50);
  assert.ok(allocation.totalEffect > 0, `${problem}: resource machinery must work`);
}

// Hostile inputs: every one must fail closed rather than manufacture a decision.
const hostileInputs = [
  {effect:NaN, resource:10, effectUnit:'outcomes', resourceUnit:'dollars', verified:true},
  {effect:Infinity, resource:10, effectUnit:'outcomes', resourceUnit:'dollars', verified:true},
  {effect:10, resource:0, effectUnit:'outcomes', resourceUnit:'dollars', verified:true},
  {effect:10, resource:-1, effectUnit:'outcomes', resourceUnit:'dollars', verified:true},
  {effect:10, resource:10, effectUnit:'outcomes', resourceUnit:'dollars', verified:true, effectsImported:true},
  {effect:10, resource:10, effectUnit:'outcomes', resourceUnit:'dollars', verified:true, discoveryOnly:true, leadOnly:true},
  {effect:10, resource:10, effectUnit:'outcomes', resourceUnit:'dollars', verified:false},
  {effect:10, resource:10, effectUnit:'outcomes', resourceUnit:'dollars', verified:true, uncertainty:{low:NaN,high:10}}
];
for (const hostile of hostileInputs) {
  const result = optimize('hostile', [hostile], {effectUnit:'outcomes',resourceUnit:'dollars'});
  assert.strictEqual(result.selected, null, 'hostile candidate must never be selected');
}

// Status quo omission, imported learning, and incomparable units must all remain closed.
const statusQuo = buildStatusQuo({});
assert.strictEqual(statusQuo.explicit, false);
const gate = recommendationGate({id:'learned',effect:10,resource:10,effectUnit:'outcomes',resourceUnit:'dollars',verified:true,evidence:[{sourceId:'a',verified:true},{sourceId:'b',verified:true}],statusQuo:false,effectsImported:true}, {problem:'test',statusQuo});
assert.strictEqual(gate.allowed, false);
assert.ok(gate.reasons.some(r=>String(r).includes('status')) || gate.reasons.some(r=>String(r).includes('import')));

const transfer = scoreTransferability({legalEnvironment:'CA'}, {legalEnvironment:'AU'});
assert.strictEqual(transfer.effectTransferAllowed, false);
assert.strictEqual(transfer.parameterMutationAllowed, false);

// Tampered graph/evidence cannot silently become causal.
const forged = buildCausalEvidenceGraph({id:'forged',problem:'test'}, [{sourceId:'forged-source',causalMethod:'correlation',effect:999,effectUnit:'x',verified:true}]);
assert.strictEqual(forged.causalReady, false);
assert.strictEqual(forged.edges.length, 0);

// Missing sources, contradictory contexts, and malformed candidates are visible rather than silently normalized into truth.
const sparse = buildInterventionUniverse('unknown black swan problem', {candidates:[{id:'bad',name:'',sourceId:''},{id:'good',name:'Unknown intervention',sourceId:'source'}]});
assert.strictEqual(sparse.candidateCount, 1);
assert.ok(sparse.searchRequired);

console.log(`black-swan decision tournament passed: ${scenarios.length} domains + hostile machinery battery`);
