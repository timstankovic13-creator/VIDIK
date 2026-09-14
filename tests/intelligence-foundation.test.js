'use strict';

const assert = require('assert');
const {
  INTERVENTION_FAMILIES,
  buildInterventionUniverse,
  planEvidenceAcquisition,
  buildCausalEvidenceGraph,
  scoreTransferability,
  optimizeResourceAllocation,
  runIntelligenceFoundation
} = require('../src/full-scope/intelligence-foundation');

const sources = [
  { id:'open-data', type:'government', evidenceTypes:['implementation','cost'], authority:0.9, independenceGroup:'government' },
  { id:'research-a', type:'research', evidenceTypes:['causal','equity'], authority:0.9, independenceGroup:'research-a' },
  { id:'research-b', type:'research', evidenceTypes:['causal','equity'], authority:0.8, independenceGroup:'research-b' }
];

const candidates = [
  { id:'violence-interruption', name:'Community violence interruption', description:'community outreach and direct violence prevention service', domains:['public-safety'], sourceId:'open-data' },
  { id:'vacant-lot', name:'Vacant lot remediation', description:'place-based environmental infrastructure intervention', domains:['environment'], sourceId:'open-data' },
  { id:'youth-jobs', name:'Youth employment program', description:'employment and economic support', domains:['employment'], sourceId:'open-data' },
  { id:'focused-deterrence', name:'Focused deterrence', description:'targeted enforcement and deterrence', domains:['public-safety'], sourceId:'research-a' }
];

const universe = buildInterventionUniverse('Reduce violent crime', { candidates, acquiredCandidates:[{ id:'mobile-crisis', name:'Mobile crisis response', description:'clinical service and early intervention', domains:['health','public-safety'], sourceId:'research-b' }] });
assert.strictEqual(universe.schemaVersion, 'vidik.intervention-universe.v2');
assert.strictEqual(universe.recommendationAllowed, false);
assert.strictEqual(universe.effectsImported, false);
assert.ok(universe.candidateCount >= 5);
assert.ok(universe.auditHash.length === 64);
assert.ok(universe.familyCoverage.length === INTERVENTION_FAMILIES.length);
assert.ok(universe.familyCoverage.every(x => x.candidateCount >= 0));
assert.ok(universe.searchRequired, 'unrepresented intervention families must trigger additional search');
assert.ok(universe.candidates.every(c => c.leadOnly && c.discoveryOnly && c.evidenceStatus === 'potential'));

const acquisition = planEvidenceAcquisition(universe, { sourceRegistry:sources, evidenceIndex:{
  'violence-interruption': { causal:{status:'verified'}, implementation:{status:'supported'} }
} });
assert.strictEqual(acquisition.schemaVersion, 'vidik.evidence-acquisition-plan.v2');
assert.ok(acquisition.candidatePlans.length === universe.candidateCount);
assert.ok(acquisition.blockedCount > 0);
assert.ok(acquisition.candidatePlans.find(p=>p.candidateId==='violence-interruption').missing.includes('cost'));
assert.ok(acquisition.candidatePlans.find(p=>p.candidateId==='focused-deterrence').independentSourceGroupsAvailable >= 2);
assert.strictEqual(acquisition.candidatePlans[0].status !== 'evidence-sufficient' || acquisition.candidatePlans[0].missing.length === 0, true);

const evidence = [
  { sourceId:'study-a', causalMethod:'difference-in-differences', effect:0.25, effectUnit:'violent-crimes/1000', verified:true, outcome:'violent crime' },
  { sourceId:'study-b', causalMethod:'systematic-review', effect:0.18, effectUnit:'violent-crimes/1000', verification:{status:'verified'}, outcome:'violent crime' },
  { sourceId:'blog', causalMethod:'correlation', effect:99, effectUnit:'violent-crimes/1000', verified:true },
  { sourceId:'bad', causalMethod:'randomized-trial', effect:Infinity, effectUnit:'violent-crimes/1000', verified:true }
];
const graph = buildCausalEvidenceGraph({id:'violence-interruption', problem:'Reduce violent crime'}, evidence);
assert.strictEqual(graph.schemaVersion, 'vidik.causal-evidence-graph.v1');
assert.strictEqual(graph.causalReady, true);
assert.strictEqual(graph.independentSourceCount, 2);
assert.strictEqual(graph.edges.length, 2);
assert.ok(graph.rejectedEvidence.some(x=>x.reason==='causal-method-not-admissible'));
assert.ok(graph.rejectedEvidence.some(x=>x.reason==='nonfinite-effect'));
assert.strictEqual(graph.effectImportAllowed, false);
assert.strictEqual(graph.parameterMutationAllowed, false);
assert.strictEqual(graph.auditHash.length, 64);

const transfer = scoreTransferability(
  {population:1000000,density:5000,baselineRate:20,serviceCapacity:100,legalEnvironment:'CA',implementationModel:'community',geography:'urban',climate:'temperate',institutionalStructure:'municipal'},
  {population:900000,density:4500,baselineRate:18,serviceCapacity:90,legalEnvironment:'CA',implementationModel:'community',geography:'urban',climate:'temperate',institutionalStructure:'municipal'}
);
assert.ok(transfer.score > 0.8);
assert.strictEqual(transfer.band, 'high');
assert.strictEqual(transfer.effectTransferAllowed, false);
assert.strictEqual(transfer.parameterMutationAllowed, false);

const poorTransfer = scoreTransferability({population:100000,density:100,legalEnvironment:'CA'}, {population:3000000,density:9000,legalEnvironment:'AU'});
assert.ok(poorTransfer.score < transfer.score);
assert.ok(['low','insufficient','moderate'].includes(poorTransfer.band));
assert.strictEqual(poorTransfer.effectTransferAllowed, false);

const allocation = optimizeResourceAllocation([
  {id:'a',effectUnit:'violent-crimes prevented',resourceUnit:'dollars',maxResource:100000,effectAtMax:20,step:10000},
  {id:'b',effectUnit:'violent-crimes prevented',resourceUnit:'dollars',maxResource:100000,effectAtMax:18,step:10000},
  {id:'c',effectUnit:'violent-crimes prevented',resourceUnit:'dollars',maxResource:50000,effectAtMax:8,step:10000}
], 120000);
assert.strictEqual(allocation.schemaVersion, 'vidik.resource-allocation.v2');
assert.ok(allocation.selected.length > 0);
assert.ok(allocation.totalEffect > 0);
assert.ok(allocation.nonlinear);
assert.strictEqual(allocation.crossUnitComparison, false);
assert.ok(allocation.opportunityCosts.length >= 1);
assert.ok(allocation.auditHash.length === 64);

const incomparable = optimizeResourceAllocation([
  {id:'crime',effectUnit:'crime',resourceUnit:'dollars',maxResource:10,effectAtMax:10},
  {id:'housing',effectUnit:'housing placements',resourceUnit:'dollars',maxResource:10,effectAtMax:10}
], 10);
assert.strictEqual(incomparable.blockedReason, 'incomparable-effect-or-resource-units');
assert.strictEqual(incomparable.totalEffect, null);

const malformed = buildInterventionUniverse('Reduce violent crime', { candidates:[{id:'x',name:'x',effectsImported:true}] });
assert.strictEqual(malformed.effectsImported, false);
assert.strictEqual(malformed.candidates[0].effectsImported, false);

const foundation = runIntelligenceFoundation('Reduce violent crime', {
  candidates,
  sourceRegistry:sources,
  evidenceIndex:{},
  causalEvidence:[{candidateId:'violence-interruption', evidence}],
  targetContext:{population:1000000,density:5000,baselineRate:20,serviceCapacity:100},
  comparableCities:[{cityId:'city-a',interventionId:'violence-interruption',context:{population:900000,density:4500,baselineRate:18,serviceCapacity:90}}]
});
assert.strictEqual(foundation.recommendationAuthority, false);
assert.strictEqual(foundation.parameterMutationAllowed, false);
assert.strictEqual(foundation.effectsImported, false);
assert.ok(foundation.causalGraphs['violence-interruption'].causalReady);
assert.strictEqual(foundation.transfer[0].transferability.effectTransferAllowed, false);
assert.ok(foundation.auditHash.length === 64);

console.log('intelligence foundation certification passed');
