'use strict';

const assert = require('node:assert/strict');
const {
  FAMILIES,
  assessFamilyRelevance,
  planEvidenceSearch,
  evaluateDiscoveryQuality,
  benchmarkNovelProblem,
  optimizeResourceAllocationExact
} = require('../src/full-scope/intelligence-validation');

function run() {
  // A: relevance must remain a hypothesis. A family with no lexical hit is untested,
  // not proven irrelevant, and malformed family claims cannot expand authority.
  const relevance = assessFamilyRelevance('reduce flood deaths and heat exposure', [
    {id:'a',name:'cooling centres',families:['system-capacity','environmental']},
    {id:'b',name:'flood warning',families:['prevention']},
    {id:'bad',name:'forged',families:['not-a-family']}
  ]);
  assert.equal(relevance.authority, 'hypothesis-only');
  assert.equal(relevance.recommendationAllowed, false);
  assert.equal(relevance.relevantFamilies.includes('prevention'), true);
  assert.equal(relevance.untestedFamilies.includes('economic'), true);
  assert.equal(relevance.hypotheses.every(h => FAMILIES.includes(h.family)), true);

  // B: acquisition must explicitly diversify causal sources and state stopping rules.
  const universe = {schemaVersion:'vidik.intervention-universe-hardening.v1', candidates:[
    {id:'flood-warning',name:'Flood warning',description:'warning',problemTags:['flood']},
    {id:'cooling',name:'Cooling centres',description:'heat',problemTags:['heat']}
  ]};
  const evidencePlans = [
    {candidateId:'flood-warning',missing:['causal','cost']},
    {candidateId:'cooling',missing:['causal']}
  ];
  const registry = [
    {id:'rct-registry',evidenceTypes:['causal'],authority:9,independenceGroup:'trial'},
    {id:'review-library',evidenceTypes:['causal','cost'],authority:8,independenceGroup:'review'},
    {id:'same-source-copy',evidenceTypes:['causal'],authority:7,independenceGroup:'trial'}
  ];
  const searchPlan = planEvidenceSearch(universe,evidencePlans,registry);
  assert.equal(searchPlan.recommendationAllowed, false);
  assert.equal(searchPlan.searches.length, 3);
  assert.equal(searchPlan.searches.filter(s=>s.independenceRequired).length, 2);
  assert.equal(searchPlan.sourceDiversity, 2);
  assert.match(searchPlan.stoppingRule, /low decision value|exhaustion/);

  // C/D: held-out benchmark scoring exposes missed interventions/families and false positives.
  const discovered = [
    {id:'flood-warning',families:['prevention'],sourceId:'src1'},
    {id:'cooling',families:['system-capacity'],sourceId:'src2'},
    {id:'wrong',families:['policy'],sourceId:'src3'}
  ];
  const benchmark = {candidateIds:['flood-warning','cooling','green-infrastructure'],families:['prevention','environmental','system-capacity'],minimumCandidateRecall:.66,minimumFamilyRecall:.66};
  const quality = evaluateDiscoveryQuality(discovered,benchmark);
  assert.equal(quality.candidate.precision, 2/3);
  assert.equal(quality.candidate.recall, 2/3);
  assert.equal(quality.family.recall, 2/3);
  assert.equal(quality.provenanceCoverage, 1);
  assert.equal(quality.recommendationAllowed, false);
  const novel = benchmarkNovelProblem('heat mortality near industrial zones',discovered,benchmark);
  assert.equal(novel.unseenProblem, true);
  assert.equal(novel.truthHiddenFromDiscovery, true);
  assert.equal(novel.pass, true);

  // C adversarial: discovering a name without provenance must reduce measured quality coverage.
  const provenanceGap = evaluateDiscoveryQuality([{id:'flood-warning',families:['prevention']}],benchmark);
  assert.equal(provenanceGap.provenanceCoverage, 0);

  // E: exact optimizer must beat the old greedy trap under a discrete grid.
  const allocation = optimizeResourceAllocationExact([
    {id:'greedy-trap',maxResource:4,step:2,fixedCost:0,effectAtMax:8,effectUnit:'lives-saved',resourceUnit:'staff-hours'},
    {id:'pair-a',maxResource:2,step:2,fixedCost:0,effectAtMax:5,effectUnit:'lives-saved',resourceUnit:'staff-hours'},
    {id:'pair-b',maxResource:2,step:2,fixedCost:0,effectAtMax:5,effectUnit:'lives-saved',resourceUnit:'staff-hours'}
  ],4,{curvature:1,quantum:2});
  assert.equal(allocation.optimalityGuaranteed, true);
  assert.equal(allocation.optimality, 'exact-discrete-step-grid');
  assert.equal(allocation.totalEffect, 10);
  assert.deepEqual(allocation.selected.map(x=>x.candidateId).sort(),['pair-a','pair-b']);

  // E adversarial: incomparable units must fail closed rather than invent a scalar.
  const blocked = optimizeResourceAllocationExact([
    {id:'a',maxResource:2,step:1,effectAtMax:3,effectUnit:'incidents',resourceUnit:'hours'},
    {id:'b',maxResource:2,step:1,effectAtMax:3,effectUnit:'dollars',resourceUnit:'hours'}
  ],2);
  assert.equal(blocked.blockedReason,'incomparable-or-missing-units');
  assert.equal(blocked.recommendationAllowed,false);

  // E adversarial: fixed costs consume budget and cannot disappear from the optimum.
  const fixed = optimizeResourceAllocationExact([
    {id:'fixed',maxResource:2,step:1,fixedCost:2,effectAtMax:8,effectUnit:'outcomes',resourceUnit:'hours'},
    {id:'free',maxResource:2,step:1,fixedCost:0,effectAtMax:4,effectUnit:'outcomes',resourceUnit:'hours'}
  ],2,{curvature:1});
  assert.deepEqual(fixed.selected.map(x=>x.candidateId),['free']);

  console.log('A-E intelligence validation: PASS');
}

run();
