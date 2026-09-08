'use strict';

const assert = require('assert');
const { SOURCES, INTERVENTIONS, runAll } = require('../scripts/municipal-production-decision-run');

const FIXTURES = Object.freeze({
  Ottawa: 'In October 2024 2,952 people reported experiencing homelessness in Ottawa.',
  Toronto: 'An estimated 15,400 people were experiencing homelessness in Toronto last fall.',
  Melbourne: 'as of May 2024, the current number of people recorded as experiencing chronic homelessness and rough sleeping in the City of Melbourne is 147.'
});

function fakeFetch(url) {
  const city = Object.keys(SOURCES).find(key => SOURCES[key].sourceUrl === url);
  if (!city) throw new Error(`unexpected-live-source:${url}`);
  return Promise.resolve({
    ok: true,
    status: 200,
    headers: { get: () => null },
    text: async () => FIXTURES[city]
  });
}

(async () => {
  const result = await runAll({
    fetchImpl: fakeFetch,
    outcome: { predicted: 0.42, observed: 0.40, checkpoint: '6-month', kind: 'acceptance-exercise' }
  });

  assert.deepStrictEqual(result.cities.map(x => x.city), ['Ottawa', 'Toronto', 'Melbourne']);
  assert.strictEqual(INTERVENTIONS.length, 3, 'all cities must use the same intervention universe');
  assert.ok(result.cities.every(x => x.interventionComparison.length === INTERVENTIONS.length));

  const ottawa = result.cities.find(x => x.city === 'Ottawa');
  assert.strictEqual(ottawa.decisionState, 'RECOMMENDATION');
  assert.strictEqual(ottawa.recommendation, 'housing');
  assert.strictEqual(ottawa.observedContext.value, 2952);
  assert.strictEqual(ottawa.observedContext.unit, 'people');
  assert.strictEqual(ottawa.observedContext.role, 'observed_context');
  assert.strictEqual(ottawa.lineage[0].kind, 'observed_context');
  assert.strictEqual(ottawa.lineage[1].kind, 'causal_effect');
  assert.strictEqual(ottawa.lineage[1].transportability.mode, 'transported');
  assert.strictEqual(ottawa.counterfactual.incrementalEffect, 0.42);
  assert.strictEqual(ottawa.learning.recalibration.targetParameterId, 'housing:effect');
  assert.strictEqual(ottawa.learning.drift.detected, false);

  const toronto = result.cities.find(x => x.city === 'Toronto');
  assert.strictEqual(toronto.decisionState, 'RECOMMENDATION');
  assert.strictEqual(toronto.recommendation, 'housing');
  assert.strictEqual(toronto.observedContext.value, 15400);
  assert.strictEqual(toronto.lineage[1].transportability.mode, 'site-supported');
  assert.strictEqual(toronto.lineage[1].transportability.targetJurisdiction, 'Toronto, Canada');
  assert.match(toronto.lineage[1].transportability.rationale, /included Toronto directly/);
  assert.notStrictEqual(toronto.sourceLineage.sourceUrl, ottawa.sourceLineage.sourceUrl, 'Toronto must not silently substitute Ottawa source evidence');
  assert.strictEqual(toronto.learning.recalibration.application, 'EXPLICIT_PARAMETER_MAPPING');

  const melbourne = result.cities.find(x => x.city === 'Melbourne');
  assert.strictEqual(melbourne.decisionState, 'BLOCKED');
  assert.strictEqual(melbourne.recommendation, null);
  assert.strictEqual(melbourne.observedContext.value, 147);
  assert.strictEqual(melbourne.audit.failureClosed, true);
  assert.strictEqual(melbourne.learning, null);
  assert.ok(melbourne.interventionComparison.every(x => x.status === 'BLOCKED'));
  assert.ok(melbourne.interventionComparison.find(x => x.id === 'housing').gate.failures.includes('causal-effect-not-transportable-to-city'));
  assert.ok(melbourne.interventionComparison.find(x => x.id === 'ase').gate.failures.includes('city-specific-ase-admissibility-evidence-missing'));

  assert.deepStrictEqual(result.acceptance, {
    Ottawa: true,
    Toronto: true,
    Melbourne: true
  });
  assert.strictEqual(ottawa.learning.outcome.error, -0.019999999999999962);
  assert.strictEqual(toronto.learning.recalibration.application, 'EXPLICIT_PARAMETER_MAPPING');
  console.log('municipal-production-decision-run: PASS');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
