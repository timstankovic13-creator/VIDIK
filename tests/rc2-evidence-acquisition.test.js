'use strict';
const {describe,it}=require('node:test');
const assert=require('node:assert/strict');
const x=require('../js/rc2-evidence-acquisition');

describe('RC2 evidence acquisition and outcome learning',()=>{
  it('prioritizes marginal exposure before downstream evidence',()=>{
    const q=x.acquisitionQueue({candidateId:'004',missingStages:['outcome','capacity','seriousHarm'],missingGates:['marginalExposure','counterfactual','transportability']});
    assert.deepEqual(q.map(v=>v.target),['marginalExposure','counterfactual','capacity','transportability','outcome','seriousHarm']);
  });
  it('does not invent unknown acquisition targets',()=>{
    const q=x.acquisitionQueue({candidateId:'005',missingStages:['not-a-stage'],missingGates:['not-a-gate']});
    assert.deepEqual(q,[]);
  });
  it('freezes an acquisition plan against mutation',()=>{
    const plan=x.freezeAcquisitionPlan([{candidateId:'006',type:'CHAIN_STAGE',target:'outcome',priority:40}]);
    assert.equal(Object.isFrozen(plan),true); assert.equal(Object.isFrozen(plan[0]),true);
  });
  it('requires immutable-decision identity and complete learning checkpoints',()=>{
    const r=x.createOutcomeLearningRecord({candidateId:'002',decisionId:'D-002',baseline:{speedCompliance:16},originalDecisionHash:'sha256:abc'});
    assert.equal(r.historicalDecisionMutable,false);
    assert.deepEqual(r.checkpoints.map(v=>v.checkpoint),['6mo','1yr','2yr','5yr']);
    assert.ok(r.checkpoints.every(v=>v.status==='PENDING'));
  });
  it('records observed outcomes without mutating the original record',()=>{
    const r=x.createOutcomeLearningRecord({candidateId:'003',decisionId:'D-003',baseline:{levelZeroMinutes:73000},originalDecisionHash:'sha256:def'});
    const r2=x.recordObservedOutcome(r,'6mo',{levelZeroMinutes:11000});
    assert.equal(r.checkpoints[0].status,'PENDING');
    assert.equal(r2.checkpoints[0].status,'RECORDED');
    assert.deepEqual(r2.checkpoints[0].observed,{levelZeroMinutes:11000});
    assert.equal(r2.historicalDecisionMutable,false);
  });
  it('rejects missing required learning identity',()=>{
    assert.throws(()=>x.createOutcomeLearningRecord({candidateId:'001',baseline:{x:1}}),/decisionId/);
  });
});
