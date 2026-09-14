'use strict';
const assert=require('assert');
const {createBlindCase,evaluateBlindRun,aggregateGeneralization,adversarialIntelligenceAudit,buildIntelligenceValidation}=require('../src/full-scope/intelligence-generalization');

const cases=[
 {caseId:'heat-mortality',problem:'reduce preventable deaths during extreme heat',gold:{candidateIds:['cooling-centres','heat-warning','tree-canopy','utility-protection'],families:['infrastructure','information','environmental','policy'],minimumCandidateRecall:.75,minimumFamilyRecall:.75}},
 {caseId:'food-access',problem:'improve reliable access to nutritious food in low-income neighbourhoods',gold:{candidateIds:['healthy-food-subsidy','mobile-grocery','school-meals','income-support'],families:['economic','direct-service'],minimumCandidateRecall:.5,minimumFamilyRecall:.75}},
 {caseId:'pedestrian-injury',problem:'reduce severe pedestrian injuries without increasing inequity',gold:{candidateIds:['traffic-calming','safe-crossing','speed-management','street-design'],families:['infrastructure','enforcement','policy'],minimumCandidateRecall:.75,minimumFamilyRecall:.66}},
 {caseId:'wildfire-smoke',problem:'reduce health harms from recurring wildfire smoke',gold:{candidateIds:['clean-air-centres','filtration-retrofit','smoke-alerts','respiratory-outreach'],families:['infrastructure','information','direct-service','clinical'],minimumCandidateRecall:.5,minimumFamilyRecall:.75}},
 {caseId:'worker-displacement',problem:'reduce long-term earnings losses after local industry automation',gold:{candidateIds:['retraining','wage-insurance','placement-services','employer-incentive'],families:['information','economic','direct-service','policy'],minimumCandidateRecall:.5,minimumFamilyRecall:.75}}
];

const discovered={
 'heat-mortality':[
  {id:'cooling-centres',name:'Cooling centres',families:['infrastructure'],sourceId:'src-a'},
  {id:'heat-warning',name:'Heat warning and outreach',families:['information'],sourceId:'src-b'},
  {id:'tree-canopy',name:'Tree canopy',families:['environmental'],sourceId:'src-c'},
  {id:'utility-protection',name:'Utility protection',families:['policy'],sourceId:'src-d'}],
 'food-access':[
  {id:'healthy-food-subsidy',name:'Healthy food subsidy',families:['economic'],sourceId:'src-a'},
  {id:'mobile-grocery',name:'Mobile grocery',families:['direct-service'],sourceId:'src-b'},
  {id:'school-meals',name:'School meals',families:['direct-service','coordination'],sourceId:'src-c'},
  {id:'income-support',name:'Income support',families:['economic','policy'],sourceId:'src-d'}],
 'pedestrian-injury':[
  {id:'traffic-calming',name:'Traffic calming',families:['infrastructure'],sourceId:'src-a'},
  {id:'safe-crossing',name:'Safe crossings',families:['infrastructure'],sourceId:'src-b'},
  {id:'speed-management',name:'Speed management',families:['enforcement'],sourceId:'src-c'},
  {id:'street-design',name:'Street redesign',families:['policy'],sourceId:'src-d'}],
 'wildfire-smoke':[
  {id:'clean-air-centres',name:'Clean air centres',families:['direct-service'],sourceId:'src-a'},
  {id:'filtration-retrofit',name:'Filtration retrofit',families:['infrastructure'],sourceId:'src-b'},
  {id:'smoke-alerts',name:'Smoke alerts',families:['information'],sourceId:'src-c'},
  {id:'respiratory-outreach',name:'Respiratory outreach',families:['clinical'],sourceId:'src-d'}],
 'worker-displacement':[
  {id:'retraining',name:'Retraining',families:['information'],sourceId:'src-a'},
  {id:'wage-insurance',name:'Wage insurance',families:['economic'],sourceId:'src-b'},
  {id:'placement-services',name:'Placement services',families:['direct-service'],sourceId:'src-c'},
  {id:'employer-incentive',name:'Employer incentive',families:['policy'],sourceId:'src-d'}]
};

const results=cases.map(c=>evaluateBlindRun(createBlindCase(c),discovered[c.caseId],{verifiedCandidateIds:discovered[c.caseId].map(x=>x.id)}));
assert.equal(results.every(r=>r.pass),true);
assert.equal(results.every(r=>r.evaluationOnly),true);
const score=aggregateGeneralization(results);
assert.equal(score.caseCount,5);
assert.equal(score.failureCases.length,0);
assert.equal(score.worstCandidateRecall>=.5,true);
assert.equal(score.worstFamilyRecall>=.66,true);
assert.equal(score.recommendationAllowed,false);

// Hidden truth cannot leak into discovery authority.
const blind=createBlindCase(cases[0]);
assert.equal(blind.publicCase.hidden,true);
assert.equal(blind.publicCase.gold,undefined);
assert.notEqual(blind.truthHash,'');

// Malicious candidates cannot manufacture authority.
const hostile=[{id:'fake',name:'Fake intervention',families:['infrastructure','NOT-A-FAMILY'],sourceId:'src-x',effectsImported:true,causalEffectImported:true,__gold:true}];
const audit=adversarialIntelligenceAudit({discovered:hostile,recommendationAllowed:true});
assert.equal(audit.pass,false);
assert.equal(audit.checks.inventedEffects,true);
assert.equal(audit.checks.invalidFamilies,true);
assert.equal(audit.checks.benchmarkLeakage,true);
assert.equal(audit.checks.prematureAuthority,true);
assert.equal(audit.recommendationAllowed,false);

// End-to-end validation stays recommendation-blocked even when discovery is strong.
const integrated=buildIntelligenceValidation(cases[0],discovered['heat-mortality'],{
 plans:[{candidateId:'cooling-centres',missing:['causal','cost']}],verifiedCandidateIds:['cooling-centres'],searchExhausted:false}
,[{id:'src-a',evidenceTypes:['causal','cost'],authority:9,independenceGroup:'g1'},{id:'src-b',evidenceTypes:['causal'],authority:8,independenceGroup:'g2'}]);
assert.equal(integrated.evaluation.pass,true);
assert.equal(integrated.adversarial.pass,true);
assert.equal(integrated.recommendationAllowed,false);
assert.equal(integrated.auditHash.length,64);

// Exact allocator must prove only the discrete grid, never continuous optimality.
const allocation=buildIntelligenceValidation(cases[0],discovered['heat-mortality'],{},[],{budget:10,candidates:[
 {id:'a',effectUnit:'deaths prevented',resourceUnit:'million dollars',maxResource:10,step:2,fixedCost:0,effectAtMax:10},
 {id:'b',effectUnit:'deaths prevented',resourceUnit:'million dollars',maxResource:10,step:2,fixedCost:2,effectAtMax:12}
]});
assert.equal(allocation.allocation.optimalityGuaranteed,true);
assert.equal(allocation.allocation.optimality,'exact-discrete-step-grid');
assert.equal(allocation.allocation.recommendationAllowed,false);

console.log('intelligence-generalization: all tests passed');
