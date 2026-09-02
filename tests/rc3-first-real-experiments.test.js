'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { CASE_PLANS, assertExperimentContract, freezePrediction, admissibilityIssues, evaluateEligibility, createLearningSchedule } = require('../js/rc3-experiment-execution');

test('003, 011, 012 have complete prospective experiment contracts', () => {
  for (const id of ['003','011','012']) assert.equal(assertExperimentContract(CASE_PLANS[id]), true);
});

test('prediction freeze is immutable and cannot be silently rewritten', () => {
  const p = freezePrediction({ frozenAt: '2026-09-02T00:00:00Z', direction: 'improve' });
  assert.equal(p.immutable, true);
  assert.throws(() => { p.direction = 'worsen'; }, TypeError);
});

test('post-boundary evidence cannot qualify as historical evidence', () => {
  const issues = admissibilityIssues({sourceId:'city-2026',sourceDate:'2026-05-28',isHistorical:true,intervention:'fire',population:'Ottawa',exposure:'x',outcome:'y',comparator:'z',provenance:'official'});
  assert.ok(issues.includes('post-boundary-evidence'));
});

test('aggregate spend, before-after claims, mismatch and unresolved conflicts fail closed', () => {
  const issues = admissibilityIssues({sourceId:'x',sourceDate:'2023-01-01',intervention:'x',population:'x',exposure:'aggregate',outcome:'x',comparator:'before',provenance:'x',aggregateSpendMasqueradingAsMarginalExposure:true,beforeAfterOnly:true,claimedCausal:true,populationMismatch:true,unresolvedConflict:true});
  assert.deepEqual(issues, ['aggregate-spend-not-marginal-exposure','before-after-not-causal','population-mismatch','unresolved-evidence-conflict']);
});

test('eligible effect estimation requires admissible evidence and a causal design', () => {
  const contract = CASE_PLANS['003'];
  const good = {sourceId:'authorized-exposure',sourceDate:'2026-09-02',intervention:'paramedic',population:'defined',exposure:'1 crew-hour',outcome:'response',comparator:'matched-period',provenance:'allocation-ledger'};
  assert.equal(evaluateEligibility({contract,evidence:[good]}).status, 'ELIGIBLE_FOR_EFFECT_ESTIMATION');
  const bad = evaluateEligibility({contract,evidence:[{...good,beforeAfterOnly:true,claimedCausal:true}]});
  assert.equal(bad.status, 'BLOCKED');
  assert.ok(bad.issues.includes('before-after-not-causal'));
});

test('learning schedule preserves original decision identity across checkpoints', () => {
  const schedule = createLearningSchedule({decisionId:'D-003-PROSPECTIVE',originalDecisionHash:'git:fee012fab5c2a4437f0a63c754e1ce70a9f3b696'});
  assert.deepEqual(schedule.map(x=>x.checkpoint), ['6mo','1yr','2yr','5yr']);
  assert.ok(schedule.every(x=>x.originalDecisionHash.startsWith('git:fee012')));
});
