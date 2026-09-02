'use strict';

const assert=require('node:assert/strict');
const {describe,it}=require('node:test');
const GOV=require('../js/rc2-evidence-governance.js');
const DI=require('../js/decision-intelligence-9.2.js');

const source='SRC-OTTAWA-001';
const base=(stage,asOf='2023-12-06',extra={})=>({evidenceId:`E-${stage}-${asOf}`,sourceRecordId:source,candidateId:'C-TEST',stage,asOf,geography:'Ottawa, Ontario, Canada',publicationTimeStatus:'KNOWN',url:'https://example.org/evidence',...extra});

describe('RC2 evidence governance',()=>{
  it('keeps the historical plane separate from current learning evidence',()=>{
    assert.equal(GOV.classifyPlane(base('resource')).plane,'HISTORICAL');
    assert.equal(GOV.classifyPlane(base('outcome','2026-01-01')).plane,'CURRENT_LEARNING');
    const chain=GOV.evaluateChain([
      base('resource'),base('capacity'),base('activity'),base('outcome'),base('systemOutcome'),
      base('outcome','2026-01-01'),base('systemOutcome','2026-01-01'),base('seriousHarm','2026-01-01')
    ],'C-TEST');
    assert.deepEqual(chain.missingHistorical,[]);
    assert.equal(chain.seriousHarmHistorical,false);
    assert.equal(chain.seriousHarmCurrent,true);
  });

  it('fails closed on unknown historical publication timing',()=>{
    const v=GOV.validateEvidence(base('outcome','2023-12-06',{publicationTimeStatus:'UNKNOWN'}));
    assert.equal(v.ok,false);
    assert.match(v.reason,/publication timing/i);
  });

  it('requires substantive promotion gates beyond merely having evidence',()=>{
    const complete=GOV.evaluateChain([
      base('resource'),base('capacity'),base('activity'),base('outcome'),base('systemOutcome'),base('seriousHarm')
    ],'C-TEST');
    const blocked=GOV.promotionGate({chain:complete});
    assert.equal(blocked.eligible,false);
    assert.equal(blocked.recommendation,'NO RECOMMENDATION');
    const eligible=GOV.promotionGate({chain:complete,causalIdentification:true,attribution:true,counterfactual:true,transportability:true,uncertaintyTested:true,sensitivityTested:true,alternativesTested:true,lineageReproducible:true});
    assert.equal(eligible.eligible,true);
  });
});

describe('RC2 decision-intelligence stress layer',()=>{
  it('detects evidence conflict and refuses silent averaging',()=>{
    const result=DI.resolveEvidenceConflict([
      {id:'A',claimKey:'x',direction:'positive',quality:.8},
      {id:'B',claimKey:'x',direction:'negative',quality:.7}
    ]);
    assert.equal(result[0].conflict,true);
    assert.equal(result[0].resolution,'CONFLICT_REQUIRES_REVIEW');
  });

  it('propagates correlated uncertainty and validates correlations',()=>{
    const result=DI.correlatedUncertainty([
      {id:'a',low:0,mean:1,high:2},{id:'b',low:0,mean:1,high:2}
    ],[{a:'a',b:'b',rho:.5}]);
    assert.ok(result.variance>0);
    assert.ok(result.covariance>0);
    assert.throws(()=>DI.correlatedUncertainty([{id:'a',low:0,mean:1,high:2}], [{a:'a',b:'missing',rho:2}]));
  });

  it('detects recommendation flips under parameter sensitivity',()=>{
    const result=DI.sensitivityFlip({
      baseline:{x:0.5},
      parameters:[{id:'x',low:0,high:1}],
      scoreFn:p=>({recommendation:Number(p.x)>=0.5?'A':'B'})
    });
    assert.equal(result.recommendationStable,false);
    assert.ok(result.flips.length>=1);
  });

  it('ranks value of information and explicit counterfactuals',()=>{
    const voi=DI.valueOfInformation({currentDecision:10,decisionValue:1,candidates:[{id:'strong',expectedBestValue:20,cost:2},{id:'weak',expectedBestValue:11,cost:2}]});
    assert.equal(voi.priority[0].id,'strong');
    const cf=DI.counterfactual({statusQuo:10,recommendation:14,metricFn:x=>x});
    assert.equal(cf.incremental,4);
    assert.equal(cf.improves,true);
  });

  it('supports outcome learning without mutating the historical decision',()=>{
    const r=DI.recalibrate({predictions:[100,100],observations:[120,130],learningRate:.25});
    assert.equal(r.n,2);
    assert.equal(r.meanError,25);
    assert.equal(r.calibrationAdjustment,6.25);
  });
});
