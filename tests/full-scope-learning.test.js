'use strict';
const assert = require('node:assert/strict');
const { comparableCityTransfer, buildTransferSet, outcomeReview, detectDrift, registerFailure } = require('../src/full-scope/learning-engine');

const rawEligible = {
  cityId:'city-a', problem:'reduce violent crime', interventionId:'intervention-1',
  evidenceVerified:true, contextComparable:true, evidenceSetId:'evidence-a', evidenceSourceIds:['s1','s2','s1']
};
const eligible = comparableCityTransfer(rawEligible);
assert.equal(eligible.eligible,true);
assert.equal(eligible.maySupplyCausalEffect,false);
assert.equal(eligible.mayAutoUpdateParameter,false);
assert.equal(eligible.provenanceComplete,true);
assert.deepEqual(eligible.evidenceSourceIds,['s1','s2']);

for (const key of ['effectsImported','causalEffectImported','localEffectApplied']) {
  const hostile = comparableCityTransfer({ ...rawEligible, cityId:'hostile', [key]:true });
  assert.equal(hostile.eligible,false);
}
for (const key of ['effect','expectedEffect','observedEffect','parameter','causalEffect','effectEstimate','effectSize']) {
  const hostile = comparableCityTransfer({ ...rawEligible, [key]:0.42 });
  assert.equal(hostile.eligible,false);
  assert(hostile.reasons.includes('numeric-effect-transfer-forbidden'));
}

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

const review = outcomeReview({effect:20,unit:'Percent'}, {effect:14,unit:'percent'});
assert.equal(review.valid,true);
assert.equal(review.effectUnit,'percent');
assert.equal(review.parameterMutationAllowed,false);
assert.equal(review.direction,'below-expectation');

for (const hostile of [
  [{effect:NaN,unit:'percent'}, {effect:14,unit:'percent'}],
  [{effect:20,unit:'percent'}, {effect:Infinity,unit:'percent'}],
  [{effect:0,unit:'percent'}, {effect:1,unit:'percent'}],
  [{effect:20,unit:'percent'}, {effect:14,unit:'dollars'}]
]) {
  const result = outcomeReview(...hostile);
  assert.equal(result.valid,false);
  assert.equal(result.parameterMutationAllowed,false);
}

const drift = detectDrift([{reviewId:'r1',expectedEffect:20,observedEffect:14,unit:'percent'}],0.2);
assert.equal(drift.driftDetected,true);
assert.equal(drift.parameterMutationAllowed,false);
assert.equal(drift.automaticParameterUpdate,false);

const hostileDrift = detectDrift([
  {reviewId:'nan',expectedEffect:NaN,observedEffect:Infinity,unit:'percent'},
  {reviewId:'zero',expectedEffect:0,observedEffect:1,unit:'percent'},
  {reviewId:'bad-unit',expectedEffect:20,observedEffect:14,unit:'percent',expectedUnit:'dollars'}
],Infinity);
assert.equal(hostileDrift.driftDetected,false);
assert.equal(hostileDrift.reviewed,0);
assert.equal(hostileDrift.threshold,0.2);
assert.equal(hostileDrift.ignoredInvalid,3);

const failure = registerFailure({id:'f1',category:'source-outage',candidateId:'x',severity:'high',description:'source unavailable'});
assert.equal(failure.status,'open');
assert.equal(failure.recommendationSuppressed,true);
assert.equal(failure.requiresHumanReview,true);
assert.equal(failure.parameterMutationAllowed,false);
assert.equal(Object.isFrozen(failure),true);

console.log('full-scope learning: PASS (provenance, anti-import, unit integrity, drift, failure controls)');
