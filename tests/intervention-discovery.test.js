'use strict';
const assert = require('assert');
const Discovery = require('../js/intervention-discovery');

const crime = Discovery.discoverInterventions({ problem: 'Reduce violent crime' });
assert.ok(crime.length >= 4, 'violent crime must produce a candidate universe, not an empty refusal');
assert.ok(crime.some(candidate => candidate.id === 'violence-interruption'));
assert.ok(crime.some(candidate => candidate.id === 'focused-deterrence'));
assert.ok(crime.some(candidate => candidate.id === 'place-based-vacant-lot-intervention'));
assert.ok(crime.every(candidate => candidate.evidenceState === 'evidence-gap'), 'discovery must not manufacture evidence');

const supported = Discovery.discoverInterventions({
  problem: 'homelessness',
  evidenceIndex: {
    'housing-first-supportive-housing': {
      causal: { status: 'verified' }, implementation: { status: 'supported' }, cost: { status: 'supported' }, equity: { status: 'supported' }
    }
  }
});
const housingFirst = supported.find(candidate => candidate.id === 'housing-first-supportive-housing');
assert.strictEqual(housingFirst.evidenceState, 'evidence-complete');
assert.deepStrictEqual(housingFirst.missingEvidence, []);
assert.strictEqual(Discovery.evidenceCoverage(supported).total, supported.length);
assert.ok(Discovery.hashCandidateUniverse(supported).length === 64);
console.log('intervention discovery tests passed');
