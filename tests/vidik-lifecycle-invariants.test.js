'use strict';
const assert = require('node:assert/strict');
const { freezeDecisionSnapshot, recordHumanDecision, reviewOutcome, recalibrate } = require('../js/vidik-lifecycle-contract');

const snapshot = freezeDecisionSnapshot({ id:'CASE-009-2023-12-06', recommendation:null, evidenceVersion:'frozen-v1', parameters:{ value:1 } });
assert.equal(Object.isFrozen(snapshot), true);
assert.equal(Object.isFrozen(snapshot.parameters), true);
assert.throws(() => { snapshot.recommendation = 'RECOMMEND'; }, TypeError);
assert.throws(() => { snapshot.parameters.value = 99; }, TypeError);

const record = recordHumanDecision(snapshot, 'PROCEED', 'Human decision made after separate governance review');
assert.equal(record.snapshot, snapshot);
assert.equal(record.humanDecision.choice, 'PROCEED');
assert.equal(record.originalRecommendation, null);
assert.notEqual(record.humanDecision, record.snapshot);

const reviewed = reviewOutcome(record, { checkpoint:'6m', observedOutcome:'measured', notes:'post-decision review' });
assert.equal(reviewed.snapshot, snapshot);
assert.equal(reviewed.outcomeReview.checkpoint, '6m');
assert.equal(snapshot.outcomeReview, undefined);

const recalibrated = recalibrate(reviewed, { version:2, parameter:'new-state' });
assert.equal(recalibrated.snapshot, snapshot);
assert.equal(recalibrated.modelState.version, 2);
assert.equal(recalibrated.modelStateVersion, 2);
assert.equal(recalibrated.snapshot.evidenceVersion, 'frozen-v1');

console.log('PASS — historical snapshot is immutable; human choice, outcome review, and recalibration remain separate');
