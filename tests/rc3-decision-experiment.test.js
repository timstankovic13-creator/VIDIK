'use strict';
const {describe,it}=require('node:test');
const assert=require('node:assert/strict');
const x=require('../js/rc3-decision-experiment');

const base={candidateId:'002',decisionId:'D-002',historicalDecisionHash:'sha256:historical',resourceUnit:'CAD',problem:'speed-related harm',baseline:{speedCompliance:16},intervention:'automated speed enforcement',marginalResource:{unit:'CAD',quantity:10000},mechanism:'deterrence',predictedOutcome:{speedComplianceDelta:[10,30]},counterfactual:'credible comparison',alternatives:['status quo','red-light camera'],uncertainty:{distribution:'bounded'},successFailureThresholds:{success:10,failure:0},measurementPlan:{primary:'speed compliance',source:'fixed sites'}};
const full=()=>x.createDecisionExperimentContract(base);

function prepared(){
 let c=x.freezePrediction(full(),{effect:{speedComplianceDelta:[10,30]},primaryOutcome:'speed compliance',evaluationMethod:'quasi-experimental',successThreshold:10});
 c=x.defineCounterfactualDesign(c,{method:'QUASI_EXPERIMENTAL',comparison:'matched eligible sites',identificationLimitations:'residual confounding'});
 c=x.recordSpillover(c,{type:'GEOGRAPHIC',detected:false,measurement:'adjacent-site monitoring'});
 c=x.defineStopRules(c,{MAX_EXPOSURE:10000,REVIEW_POINT:'6mo',STOP_CONDITION:'harm threshold exceeded',ROLLBACK_CONDITION:'adverse signal',REALLOCATION_CONDITION:'persistent null effect',ESCALATION_CONDITION:'serious harm'});
 c=x.recordHumanDecision(c,{decision:'AGREE',reason:'evidence and operational fit'});
 return c;
}

describe('RC3 decision experiment foundation',()=>{
 it('requires the complete pre-registration contract',()=>{assert.throws(()=>x.createDecisionExperimentContract({candidateId:'x'}),/RC3 contract missing/); const c=full(); assert.equal(c.historicalDecisionMutable,false); assert.equal(Object.isFrozen(c),true);});
 it('requires immutable historical identity and marginal resource unit',()=>{const bad={...base}; delete bad.historicalDecisionHash; assert.throws(()=>x.createDecisionExperimentContract(bad),/historicalDecisionHash/); const bad2={...base}; delete bad2.resourceUnit; assert.throws(()=>x.createDecisionExperimentContract(bad2),/resourceUnit/);});
 it('freezes prediction and rejects a second freeze',()=>{const c=x.freezePrediction(full(),{effect:1,primaryOutcome:'x',evaluationMethod:'OBSERVATIONAL',successThreshold:0}); assert.equal(c.predictionFreeze.frozen,true); assert.throws(()=>x.freezePrediction(c,{effect:2,primaryOutcome:'x',evaluationMethod:'OBSERVATIONAL',successThreshold:0}),/already frozen/);});
 it('keeps allocation history append-only and preserves prior records',()=>{const c=full(); const c1=x.recordAllocation(c,{resource:'CAD',quantity:1000,recipient:'program',startDate:'2026-01-01'}); const c2=x.recordAllocation(c1,{resource:'CAD',quantity:500,recipient:'program',startDate:'2026-02-01'}); assert.equal(c1.allocationLedger.length,1); assert.equal(c2.allocationLedger.length,2); assert.equal(c2.allocationLedger[0].quantity,1000); assert.equal(Object.isFrozen(c2.allocationLedger),true);});
 it('requires an explicit counterfactual method and limitations',()=>{assert.throws(()=>x.defineCounterfactualDesign(full(),{method:'MADE_UP',comparison:'x',identificationLimitations:'y'}),/unsupported/); assert.throws(()=>x.defineCounterfactualDesign(full(),{method:'OBSERVATIONAL'}),/requires comparison/);});
 it('records spillover and requires measurement',()=>{assert.throws(()=>x.recordSpillover(full(),{type:'GEOGRAPHIC',detected:false}),/requires/); const c=x.recordSpillover(full(),{type:'SERVICE',detected:true,measurement:'wait-time monitoring'}); assert.equal(c.spilloverLog[0].detected,true);});
 it('routes measurement failure to inconclusive rather than success/failure',()=>{const c=x.recordLearningStatus(full(),'INCONCLUSIVE_DATA_FAILURE',{reason:'primary data feed unavailable'}); assert.equal(c.learningStatus.status,'INCONCLUSIVE_DATA_FAILURE'); assert.throws(()=>x.recordLearningStatus(full(),'INCONCLUSIVE_DATA_FAILURE'),/reason/);});
 it('requires every stop rule',()=>{assert.throws(()=>x.defineStopRules(full(),{}),/stop rules missing/); const c=prepared(); assert.deepEqual(Object.keys(c.stopRules).sort(),x.STOP_RULES.sort());});
 it('separates VIDIK recommendation, human decision, and actual allocation',()=>{const c=full(); const h=x.recordHumanDecision(c,{decision:'MODIFY',reason:'budget constraint'}); assert.equal(h.humanDecision.decision,'MODIFY'); assert.equal(h.vidikRecommendation,null); assert.throws(()=>x.recordActualAllocation(c,{resource:'CAD',quantity:1}),/human decision/); const a=x.recordActualAllocation(h,{resource:'CAD',quantity:5000}); assert.equal(a.actualAllocation.quantity,5000);});
 it('validates the complete RC3 contract only after required controls exist',()=>{const c=full(); assert.equal(x.validateRC3(c).eligible,false); const p=prepared(); assert.equal(x.validateRC3(p).eligible,true);});
 it('never permits historical decision mutation through RC3 operations',()=>{const p=prepared(); const a=x.recordAllocation(p,{resource:'CAD',quantity:1,recipient:'x',startDate:'2026-01-01'}); const l=x.recordLearningStatus(a,'LEARNING'); assert.equal(l.historicalDecisionMutable,false); assert.equal(l.historicalDecisionHash,'sha256:historical'); assert.equal(p.historicalDecisionHash,'sha256:historical');});
});
