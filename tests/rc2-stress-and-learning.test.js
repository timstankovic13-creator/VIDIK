'use strict';
const {describe,it}=require('node:test');
const assert=require('node:assert/strict');
const governance=require('../js/rc2-evidence-governance');
const stress=require('../js/rc2-stress-and-learning');

function evidence(candidateId, stage, asOf, publicationTimeStatus='KNOWN') {
  return {evidenceId:`${candidateId}-${stage}-${asOf}`,sourceRecordId:`SRC-${candidateId}-${stage}`,candidateId,stage,asOf,geography:'Ottawa',url:'https://ottawa.ca/',publicationTimeStatus};
}

describe('RC2 quantitative evidence governance',()=>{
  it('keeps later quantitative evidence in CURRENT_LEARNING',()=>{
    const items=[
      evidence('002','resource','2023-03-01'), evidence('002','capacity','2023-03-01'), evidence('002','activity','2023-03-01'),
      evidence('002','outcome','2026-01-01'), evidence('002','systemOutcome','2026-01-01'), evidence('002','seriousHarm','2026-01-01')
    ];
    const chain=governance.evaluateChain(items,'002');
    assert.deepEqual(chain.historicalStages,['resource','capacity','activity']);
    assert.deepEqual(chain.currentLearningStages,['outcome','systemOutcome','seriousHarm']);
    const gate=governance.promotionGate({chain,causalIdentification:true,attribution:true,counterfactual:true,transportability:true,uncertaintyTested:true,sensitivityTested:true,alternativesTested:true,lineageReproducible:true});
    assert.equal(gate.eligible,false);
    assert.equal(gate.recommendation,'NO RECOMMENDATION');
  });

  it('fails closed when publication timing is unknown historically',()=>{
    const item=evidence('002','outcome','2023-10-01','UNKNOWN');
    assert.equal(governance.validateEvidence(item).ok,false);
  });

  it('detects recommendation flips under adversarial stress',()=>{
    const result=stress.stressTest({
      baselineScores:{ASE:10,PARAMEDIC:8},
      scenarios:[
        {name:'BASELINE',scores:{ASE:10,PARAMEDIC:8}},
        {name:'WIDEN_UNCERTAINTY',scores:{ASE:7,PARAMEDIC:8}},
        {name:'REMOVE_STRONGEST_EVIDENCE',scores:{ASE:5,PARAMEDIC:8}}
      ]
    });
    assert.equal(result.ok,true);
    assert.equal(result.recommendationStable,false);
    assert.deepEqual(result.flips,['WIDEN_UNCERTAINTY','REMOVE_STRONGEST_EVIDENCE']);
  });

  it('passes a stable recommendation only when no stress scenario flips it',()=>{
    const result=stress.stressTest({
      baselineScores:{ASE:10,PARAMEDIC:6},
      scenarios:[
        {name:'BASELINE',scores:{ASE:10,PARAMEDIC:6}},
        {name:'WIDEN_UNCERTAINTY',scores:{ASE:9,PARAMEDIC:6}},
        {name:'TRANSPORTABILITY_PENALTY',scores:{ASE:8,PARAMEDIC:6}}
      ]
    });
    assert.equal(result.recommendationStable,true);
    assert.deepEqual(result.flips,[]);
  });

  it('requires immutable decision snapshot and all outcome-learning checkpoints',()=>{
    const blocked=stress.outcomeLearningGate({decisionId:'D-002',decisionSnapshotHash:'hash',baseline:{metric:'speedCompliance',value:0.16},checkpoints:[{years:0.5},{years:1}],observations:[{years:0.5,value:0.57}]});
    assert.equal(blocked.eligible,false);
    assert.ok(blocked.failures.includes('checkpoint-2y-missing'));
    const ready=stress.outcomeLearningGate({decisionId:'D-002',decisionSnapshotHash:'hash',baseline:{metric:'speedCompliance',value:0.16},checkpoints:[{years:0.5},{years:1},{years:2},{years:5}],observations:[{years:0.5,value:0.57}]});
    assert.equal(ready.eligible,true);
    assert.equal(ready.preservesOriginalDecision,true);
  });
});
