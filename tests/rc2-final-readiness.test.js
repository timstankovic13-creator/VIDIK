'use strict';
const {describe,it}=require('node:test');
const assert=require('node:assert/strict');
const g=require('../js/rc2-decision-execution-governance');
const evidence=require('../js/rc2-evidence-governance');
const acquisition=require('../js/rc2-evidence-acquisition');

describe('RC2 final execution governance',()=>{
  it('requires all six final execution gates',()=>{
    const blocked=g.evaluateExecutionGates();
    assert.equal(blocked.eligible,false);
    assert.equal(blocked.failures.length,6);
    const ready=g.evaluateExecutionGates({legalAuthority:true,implementationFeasibility:true,equityAssessed:true,measurementReady:true,implementationImpactSeparated:true,decisionLifecycleReady:true});
    assert.equal(ready.eligible,true);
  });
  it('fails closed on unknown or restricted legal authority',()=>{
    assert.equal(g.evaluateLegalAuthority({authorized:false}).authorized,false);
    assert.equal(g.evaluateLegalAuthority({authorized:true,jurisdiction:'Ontario',effectiveFrom:'2023-01-01'}).status,'AUTHORIZED');
  });
  it('requires operational feasibility rather than assuming implementation',()=>{
    const r=g.evaluateImplementationFeasibility({procurementReady:true,staffingReady:true,infrastructureReady:false,dependenciesResolved:true,timeframeDefined:true});
    assert.equal(r.ready,false); assert.ok(r.failures.includes('infrastructure-not-ready'));
  });
  it('requires a measurement contract before outcome learning',()=>{
    const r=g.evaluateMeasurementReadiness({metricDefined:true,baselineDefined:true,dataOwnerDefined:true,frequencyDefined:true,denominatorDefined:true,missingDataPolicyDefined:true,revisionPolicyDefined:true,interventionSensitive:false});
    assert.equal(r.ready,false); assert.ok(r.failures.includes('intervention-sensitivity-incomplete'));
  });
  it('keeps distributional impacts explicit',()=>{
    const r=g.evaluateDistributionalImpact({beneficiariesIdentified:true,bearersIdentified:true,geographicEffectsAssessed:true,differentialEffectsAssessed:true,tradeoffsExposed:true});
    assert.equal(r.ready,true);
  });
  it('never converts implementation into impact without attribution',()=>{
    const r=g.classifyImplementationImpact({implemented:true,activityObserved:true,outcomeObserved:true,causalAttributionEstablished:false});
    assert.equal(r.status,'OUTCOME_OBSERVED_ATTRIBUTION_UNPROVEN'); assert.equal(r.impactClaimAllowed,false);
  });
  it('preserves immutable decision identity through expiry and reauthorization',()=>{
    const original=g.createDecisionLifecycle({decisionId:'D-002',originalDecisionHash:'sha256:test',status:'ACTIVE',reviewAt:'2027-01-01'});
    const expired=g.transitionDecisionLifecycle(original,'EXPIRED');
    const reauth=g.transitionDecisionLifecycle(expired,'REAUTHORIZED');
    assert.equal(expired.status,'EXPIRED'); assert.equal(reauth.status,'ACTIVE');
    assert.equal(reauth.originalDecisionHash,original.originalDecisionHash);
    assert.equal(reauth.historicalDecisionMutable,false);
  });
  it('keeps RC1 historical cases fail-closed while later evidence remains learning-only',()=>{
    const items=['resource','capacity','activity'].map(stage=>({evidenceId:`002-${stage}`,sourceRecordId:`SRC-${stage}`,candidateId:'002',stage,asOf:'2023-03-01',geography:'Ottawa',url:'https://ottawa.ca/',publicationTimeStatus:'KNOWN'}));
    items.push({evidenceId:'002-outcome-2026',sourceRecordId:'SRC-outcome-2026',candidateId:'002',stage:'outcome',asOf:'2026-01-01',geography:'Ottawa',url:'https://ottawa.ca/',publicationTimeStatus:'KNOWN'});
    const chain=evidence.evaluateChain(items,'002');
    assert.deepEqual(chain.historicalStages,['resource','capacity','activity']);
    assert.deepEqual(chain.currentLearningStages,['outcome']);
    assert.equal(evidence.promotionGate({chain,causalIdentification:true,attribution:true,counterfactual:true,transportability:true,uncertaintyTested:true,sensitivityTested:true,alternativesTested:true,lineageReproducible:true}).eligible,false);
  });
  it('prioritizes marginal evidence before downstream outcomes',()=>{
    const q=acquisition.acquisitionQueue({candidateId:'002',missingStages:['outcome','systemOutcome'],missingGates:['marginalExposure','counterfactual','attribution','transportability']});
    assert.deepEqual(q.map(x=>x.target),['marginalExposure','counterfactual','attribution','transportability','outcome','systemOutcome']);
  });
  it('does not declare final RC2 ready with incomplete substantive evidence',()=>{
    const r=g.finalRc2Gate({evidenceReady:false,causalReady:false,executionReady:true,stressReady:true,learningReady:true,lineageReady:true});
    assert.equal(r.ready,false); assert.equal(r.status,'RC2 BLOCKED');
  });
});
