'use strict';
const assert = require('node:assert/strict');
const { comparableCityTransfer, buildTransferSet, outcomeReview, detectDrift, registerFailure } = require('../src/full-scope/learning-engine');

const eligible = comparableCityTransfer({ cityId:'city-a', problem:'reduce violent crime', interventionId:'intervention-1', evidenceVerified:true, contextComparable:true });
assert.equal(eligible.eligible,true);
assert.equal(eligible.maySupplyCausalEffect,false);
assert.equal(eligible.mayAutoUpdateParameter,false);

const imported = comparableCityTransfer({ cityId:'city-b', problem:'reduce violent crime', interventionId:'intervention-1', evidenceVerified:true, contextComparable:true, effectsImported:true });
assert.equal(imported.eligible,false);
assert(imported.reasons.includes('causal-effect-import-forbidden'));

const set = buildTransferSet('reduce violent crime', [eligible, imported]);
assert.equal(set.eligibleCount,1);
assert.equal(set.leads.length,1);

const review = outcomeReview({effect:20}, {effect:14});
assert.equal(review.valid,true);
assert.equal(review.parameterMutationAllowed,false);
assert.equal(review.direction,'below-expectation');

const drift = detectDrift([{reviewId:'r1',expectedEffect:20,observedEffect:14}],0.2);
assert.equal(drift.driftDetected,true);
assert.equal(drift.parameterMutationAllowed,false);

const failure = registerFailure({id:'f1',category:'source-outage',candidateId:'x',severity:'high',description:'source unavailable'});
assert.equal(failure.status,'open');
assert.equal(failure.recommendationSuppressed,true);

console.log('full-scope learning: PASS (comparable-city guardrails, outcome review, drift detection, failure registry)');
