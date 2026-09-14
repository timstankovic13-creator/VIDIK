'use strict';
const assert = require('node:assert/strict');
const { recommendationGate, decisionReadiness, sensitivity, estimateVOI, auditHash, evidenceState } = require('../src/full-scope/decision-engine');

const problem = 'reduce violent crime';
const statusQuo = { explicit: true, description: 'Current municipal strategy continues.', effect: 10, effectUnit: 'incidents', resource: 100, resourceUnit: 'staff-hours' };

const lead = { id: 'lead-1', name: 'Community intervention', discoveryOnly: true, leadOnly: true, evidence: [], parameters: [] };
const imported = { id: 'imported-1', name: 'Comparable-city program', discoveryOnly: false, leadOnly: false, effectsImported: true, evidence: [{id:'e1',sourceId:'a',design:'rct',verification:{status:'verified'}},{id:'e2',sourceId:'b',design:'quasi-experimental',verification:{status:'verified'}}], parameters:[{id:'p',effect:5,effectUnit:'incidents avoided',resource:100,resourceUnit:'staff-hours',verified:true,sourceIds:['a','b']}] };
const admissible = { id: 'local-1', name: 'Locally verified program', discoveryOnly: false, leadOnly: false, evidence: [{id:'e1',sourceId:'a',design:'rct',verification:{status:'verified'},local:true},{id:'e2',sourceId:'b',design:'quasi-experimental',verification:{status:'verified'}}], parameters:[{id:'p',effect:5,effectUnit:'incidents avoided',resource:100,resourceUnit:'staff-hours',verified:true,sourceIds:['a','b']}] };

const blockedLead = recommendationGate(lead,{problem,statusQuo});
assert.equal(blockedLead.allowed,false);
assert(blockedLead.blockedReasons.includes('discovery-lead-not-recommendation'));

const blockedImported = recommendationGate(imported,{problem,statusQuo});
assert.equal(blockedImported.allowed,false);
assert(blockedImported.blockedReasons.includes('imported-effect-blocked'));

const ready = recommendationGate(admissible,{problem,statusQuo});
assert.equal(ready.allowed,true);
assert.deepEqual(ready.gates,{A_problemDefined:true,B_statusQuoExplicit:true,C_independentEvidence:true,D_verifiedParameter:true,E_resourceEffectUnits:true});

const whole = decisionReadiness(problem,[lead,imported,admissible],{statusQuo});
assert.equal(whole.candidateCount,3);
assert.equal(whole.eligibleCount,1);
assert.equal(whole.recommendation.candidateId,'local-1');

const evidence = evidenceState(admissible);
assert.equal(evidence.hasIndependentCausalEvidence,true);
assert.equal(evidence.hasLocalCausalEvidence,true);

const sens = sensitivity(admissible,[{id:'downside',effect:1,resource:100,baselineRatio:.02,recommendationEligible:true},{id:'upside',effect:10,resource:100,baselineRatio:.02,recommendationEligible:true}]);
assert.equal(sens.defined,true);
assert.equal(sens.scenarios.length,2);

const voi = estimateVOI({uncertainty:.5,decisionGap:10,researchCost:2});
assert.equal(voi.valueOfInformation,5);
assert.equal(voi.priority,'high');

(async()=>{
  const a = await auditHash({problem,decision:'blocked'});
  const b = await auditHash({problem,decision:'blocked'});
  assert.equal(a,b);
  console.log('full-scope decision engine: PASS (lead separation, evidence gates, verified parameters, readiness, sensitivity, VOI, deterministic audit)');
})();
