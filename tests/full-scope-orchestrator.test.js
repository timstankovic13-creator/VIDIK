'use strict';
const assert = require('node:assert/strict');
const { runDecisionPipeline, prepareAnalysis, finalizeArtifact } = require('../src/full-scope/orchestrator');

const candidate = {
  id:'speed-management', name:'Speed management', discoveryOnly:false, leadOnly:false,
  verified:true, effect:12, resource:100, effectUnit:'injuries', resourceUnit:'dollars',
  evidence:[{sourceId:'e1',verified:true,design:'randomized'},{sourceId:'e2',verified:true,design:'difference-in-differences'}],
  parameters:[{id:'p1',effect:12,resource:100,effectUnit:'injuries',resourceUnit:'dollars',verified:true,sourceIds:['e1','e2']}]
};
const weaker = {...candidate,id:'alt',effect:6,resource:100};

const pipeline = runDecisionPipeline('reduce injuries',[candidate,weaker],{budget:100,statusQuo:{explicit:true,description:'continue current approach'}});
assert.equal(pipeline.recommendation.allowed,true);
assert.equal(pipeline.recommendation.candidateId,'speed-management');
assert.equal(pipeline.readyForArtifact,true);
assert.equal(pipeline.statusQuo.explicit,true);
assert.equal(pipeline.optimizer.blocked.find(row => row.candidate.id === 'alt')?.reasons.includes('effect-parameter-conflict'),true);

const blocked = runDecisionPipeline('reduce injuries',[{...candidate,id:'lead',discoveryOnly:true,leadOnly:true}],{statusQuo:{explicit:true}});
assert.equal(blocked.recommendation.allowed,false);
assert.equal(blocked.readyForArtifact,false);

const learned = runDecisionPipeline('reduce injuries',[candidate],{statusQuo:{explicit:true},comparableCities:[{
  cityId:'city-a',problem:'reduce injuries',interventionId:'x',evidenceVerified:true,contextComparable:true,evidenceSetId:'set-a',evidenceSourceIds:['s1','s2'],effect:99
}]});
assert.equal(learned.comparableCityTransfer.eligibleCount,0);
assert.equal(learned.comparableCityTransfer.leads.length,1);
assert.equal(learned.recommendation.allowed,true);

const analysis = prepareAnalysis(candidate,[{id:'low',effect:5,resource:100,baselineRatio:0.08}],{uncertainty:0.5,decisionGap:10,researchCost:2});
assert.equal(analysis.parameterMutationAllowed,false);
assert.equal(analysis.sensitivity.defined,true);
assert.equal(analysis.voi.priority,'high');

(async () => {
  const artifact = await finalizeArtifact(pipeline,{counterfactual:{statusQuoExplicit:true,recommendationEligible:true,effect:12,resource:100,effectUnit:'injuries',resourceUnit:'dollars'},reviewSchedule:[{at:'6mo',purpose:'outcome review'},{at:'1yr',purpose:'drift review'}],evidence:candidate.evidence,parameters:candidate.parameters});
  assert.equal(artifact.schemaVersion,'vidik.decision-artifact.v1');
  assert.equal(artifact.recommendation.allowed,true);
  assert.equal(artifact.governance.parameterMutationAllowed,false);
  console.log('full-scope orchestrator: PASS (gates -> optimizer -> learning -> analysis -> artifact)');
})().catch(error => { console.error(error); process.exitCode = 1; });
