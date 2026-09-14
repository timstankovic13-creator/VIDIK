'use strict';
const assert = require('node:assert/strict');
const { createLearningLedger, appendOutcome, appendFailure, reviewDrift, validateLearningLedger } = require('../src/full-scope/learning-ledger');

(async () => {
  let ledger = await createLearningLedger({problem:'reduce violent crime',candidateId:'candidate-a',baselineArtifactHash:'baseline-1'});
  assert.equal(ledger.entries.length,0);
  assert.equal(ledger.parameterMutationAllowed,false);
  assert.equal((await validateLearningLedger(ledger)).valid,true);

  ledger = await appendOutcome(ledger,{effect:20,unit:'percent'},{effect:14,unit:'percent'},{reviewId:'r1',provenance:'outcome-source-1',recordedAt:'2026-09-14T00:00:00Z'});
  assert.equal(ledger.entries.length,1);
  assert.equal(ledger.entries[0].review.direction,'below-expectation');
  assert.equal(ledger.parameterMutationAllowed,false);

  const drift = reviewDrift(ledger,0.2);
  assert.equal(drift.driftDetected,true);
  assert.equal(drift.automaticParameterUpdate,false);

  ledger = await appendFailure(ledger,{id:'f1',category:'source-outage',severity:'critical',description:'source unavailable'});
  assert.equal(ledger.entries.length,2);
  assert.equal(ledger.entries[1].failure.recommendationSuppressed,true);
  assert.equal((await validateLearningLedger(ledger)).valid,true);

  const tampered = JSON.parse(JSON.stringify(ledger));
  tampered.entries[0].review.observedEffect = 999;
  assert.equal((await validateLearningLedger(tampered)).valid,false);

  await assert.rejects(() => appendOutcome(ledger,{effect:0,unit:'percent'},{effect:1,unit:'percent'}), /learning-outcome-invalid/);
  const mutation = {...ledger,parameterMutationAllowed:true};
  assert.equal((await validateLearningLedger(mutation)).valid,false);

  console.log('full-scope learning ledger: PASS (immutable outcomes, drift review, failure records, tamper detection)');
})().catch(error => { console.error(error); process.exitCode = 1; });
