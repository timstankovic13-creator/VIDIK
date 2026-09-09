'use strict';

const assert = require('assert');
const { CANONICAL_18 } = require('../js/vidik-architecture-contract');
const { runCanonicalAll, withResourceEnvelope } = require('../scripts/municipal-canonical-decision-run');

(async () => {
  const options = withResourceEnvelope({}, 5000000);
  const result = await runCanonicalAll(options);

  assert.strictEqual(result.schemaVersion, 'vidik.canonical-three-city-decision.v1');
  assert.strictEqual(result.cities.length, 3);

  for (const decision of result.cities) {
    assert.strictEqual(Object.keys(decision).length, CANONICAL_18.length);
    assert.strictEqual(decision.identityBrief.schemaVersion, 'vidik.canonical-decision-object.v1');
    assert.strictEqual(decision.resourceEnvelope.marginalUnit.amount, 5000000);
    assert.strictEqual(decision.resourceEnvelope.marginalUnit.unit, 'CAD');
    assert.strictEqual(decision.integrity.syntheticEvidenceExcluded, true);
    assert.strictEqual(decision.outcomeLearningCheckpoints.syntheticDefaultLearning, false);
  }

  const ottawa = result.cities.find(x => x.identityBrief.city === 'Ottawa');
  const toronto = result.cities.find(x => x.identityBrief.city === 'Toronto');
  const melbourne = result.cities.find(x => x.identityBrief.city === 'Melbourne');
  assert.strictEqual(ottawa.rationale.recommendation, 'housing');
  assert.strictEqual(toronto.rationale.recommendation, 'housing');
  assert.strictEqual(melbourne.rationale.recommendation, null);
  assert.strictEqual(melbourne.driftFailureRegistry.failureClosed, true);

  assert.throws(() => withResourceEnvelope({}, 0), /positive-finite/);
  assert.throws(() => withResourceEnvelope({}, 'not-a-number'), /positive-finite/);

  console.log('VIDIK canonical production integration: PASS');
  console.log(`Canonical parts per decision: ${CANONICAL_18.length}`);
  console.log('Cities: Ottawa=RECOMMENDATION, Toronto=RECOMMENDATION, Melbourne=BLOCKED');
  console.log('Marginal resource envelope: CAD 5,000,000 supplied and preserved');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
