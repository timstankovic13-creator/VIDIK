'use strict';
const assert = require('node:assert/strict');
const { comparableCityTransfer, buildTransferSet, outcomeReview, detectDrift, registerFailure } = require('../src/full-scope/learning-engine');

const rawEligible = {
  cityId:'city-a', problem:'reduce violent crime', interventionId:'intervention-1',
  evidenceVerified:true, contextComparable:true, evidenceSetId:'evidence-a', evidenceSourceIds:['s1','s2']
};
const eligible = comparableCityTransfer(rawEligible);
assert.equal(eligible.eligible,true);
assert.equal(eligible.maySupplyCausalEffect,false);
assert.equal(eligible.mayAutoUpdateParameter,false);
assert.deepEqual(eligible.evidenceSourceIds,['s1','s2']);

const imported = comparableCityTransfer({ ...rawEligible, cityId:'city-b', effectsImported:true });
assert.equal(imported.eligible,false);
assert(imported.reasons.includes('causal-effect-import-forbidden'));

const numericImport = comparableCityTransfer({ ...rawEligible, effect:0.42 });
assert.equal(numericImport.eligible,false);
assert(numericImport.reasons.includes('numeric-effect-transfer-forbidden'));

const noProvenance = comparableCityTransfer({ ...rawEligible, evidenceSetId:undefined, evidenceSourceIds:[] });
assert.equal(noProvenance.eligible,false);
assert(noProvenance.reasons.includes('transfer-provenance-missing'));

const set = buildTransferSet('reduce violent crime', [rawEligible, { ...rawEligible, cityId:'city-b', effectsImported:true }]);
assert.equal(set.eligibleCount,1);
assert.equal(set.leads.length,1);
assert.equal(set.parameterMutationAllowed,false);
assert.equal(set.causalEffectImportAllowed,false);

const unrelated = buildTransferSet('housing affordability', [rawEligible]);
assert.equal(unrelated.relevantCount,0);
assert.equal(unrelated.eligibleCount,0);

const review = outcomeReview({effect:20,unit:'percent'}, {effect:14,unit:'percent'});
assert.equal(review.valid,true);
assert.equal(review.parameterMutationAllowed,false);
assert.equal(review.direction,'below-expectation');

const invalidReview = outcomeReview({effect:20,unit:'percent'}, {effect:14,unit:'dollars'});
assert.equal(invalidReview.valid,false);
assert.equal(invalidReview.parameterMutationAllowed,false);

const drift = detectDrift([{reviewId:'r1',expectedEffect:20,observedEffect:14,unit:'percent'}],0.2);
assert.equal(drift.driftDetected,true);
assert.equal(drift.parameterMutationAllowed,false);
assert.equal(drift.automaticParameterUpdate,false);

const hostileDrift = detectDrift([{reviewId:'bad',expectedEffect:NaN,observedEffect:Infinity,unit:'percent'}],NaN);
assert.equal(hostileDrift.driftDetected,false);
assert.equal(hostileDrift.reviewed,0);
assert.equal(hostileDrift.threshold,0.2);

const failure = registerFailure({id:'f1',category:'source-outage',candidateId:'x',severity:'high',description:'source unavailable'});
assert.equal(failure.status,'open');
assert.equal(failure.recommendationSuppressed,true);
assert.equal(failure.parameterMutationAllowed,false);
assert.equal(Object.isFrozen(failure),true);

console.log('full-scope learning: PASS (comparable-city guardrails, provenance, outcome review, drift detection, failure registry)');
