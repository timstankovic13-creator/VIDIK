'use strict';

const assert = require('assert');
const { SOURCES, runAll, runCity, parseObservation } = require('../scripts/municipal-production-decision-run');

const FIXTURES = Object.freeze({
  Ottawa: 'In October 2024 3,111 people reported experiencing homelessness in Ottawa.',
  Toronto: 'An estimated 15,877 people were experiencing homelessness in Toronto last fall.',
  Melbourne: 'as of May 2024, the current number of people recorded as experiencing chronic homelessness and rough sleeping in the City of Melbourne is 163.'
});

function fakeFetch(url) {
  const city = Object.keys(SOURCES).find(key => SOURCES[key].sourceUrl === url);
  if (!city) throw new Error(`unexpected-source:${url}`);
  return Promise.resolve({ ok: true, status: 200, headers: { get: () => null }, text: async () => FIXTURES[city] });
}

const AU_HOUSING = {
  admissible: true,
  evidence: {
    id: 'au-housing-first-evidence', estimate: 0.35,
    unit: 'absolute stable-housing probability difference',
    uncertainty: { low: 0.28, high: 0.42 }, source: 'Australian Housing First evidence for controlled transportability validation',
    jurisdiction: 'Australia', mode: 'site-supported', sourceJurisdiction: 'Australia', targetJurisdiction: 'Melbourne, Australia',
    rationale: 'Controlled validation evidence supplied explicitly to test that the Melbourne block is evidence-driven rather than city-name hardcoded.'
  }
};

const ASE_STRONG = {
  admissible: true,
  evidence: {
    id: 'controlled-ase-evidence', estimate: 0.60,
    unit: 'absolute target-outcome improvement', uncertainty: { low: 0.52, high: 0.68 },
    source: 'Controlled scenario evidence for recommendation-flip validation', jurisdiction: 'Canada', mode: 'controlled-scenario',
    sourceJurisdiction: 'Canada', targetJurisdiction: 'Ottawa, Canada', rationale: 'Synthetic validation scenario; must never be treated as production evidence.'
  }
};

(async () => {
  // Phase 1: artifact/source integrity — values must come from source text, not constants.
  assert.strictEqual(parseObservation('Ottawa', FIXTURES.Ottawa).value, 3111);
  assert.strictEqual(parseObservation('Toronto', FIXTURES.Toronto).value, 15877);
  assert.strictEqual(parseObservation('Melbourne', FIXTURES.Melbourne).value, 163);
  const productionShape = await runAll({ fetchImpl: fakeFetch });
  assert.deepStrictEqual(productionShape.cities.map(x => x.observedValue), [3111, 15877, 163]);

  // Phase 2: no synthetic learning result may be emitted by a normal production run.
  assert.strictEqual(productionShape.cities.find(x => x.city === 'Ottawa').learning, null);
  assert.strictEqual(productionShape.cities.find(x => x.city === 'Toronto').learning, null);

  // Phase 3: recommendation sensitivity / flip — materially stronger admissible ASE evidence must beat Housing First.
  const baseline = await runCity('Ottawa', { fetchImpl: fakeFetch });
  const flipped = await runCity('Ottawa', {
    fetchImpl: fakeFetch,
    scenarioEvidence: { Ottawa: { ase: ASE_STRONG } }
  });
  assert.strictEqual(baseline.recommendation, 'housing');
  assert.strictEqual(flipped.recommendation, 'ase');
  assert.ok(flipped.interventionComparison.find(x => x.id === 'ase').score > flipped.interventionComparison.find(x => x.id === 'housing').score);

  // Phase 4: Melbourne must unblock only when explicit Australian causal evidence is supplied.
  const blocked = productionShape.cities.find(x => x.city === 'Melbourne');
  assert.strictEqual(blocked.decisionState, 'BLOCKED');
  const australianEvidence = await runCity('Melbourne', { fetchImpl: fakeFetch, scenarioEvidence: { Melbourne: { housing: AU_HOUSING } } });
  assert.strictEqual(australianEvidence.decisionState, 'RECOMMENDATION');
  assert.strictEqual(australianEvidence.recommendation, 'housing');
  assert.strictEqual(australianEvidence.interventionComparison.find(x => x.id === 'housing').gate.causalEvidence.targetJurisdiction, 'Melbourne, Australia');
  assert.strictEqual(australianEvidence.audit.scenario, true);

  // Phase 5: competing-intervention challenge — recommendation must be a scored choice, not first-admissible ordering.
  assert.notStrictEqual(baseline.interventionComparison.find(x => x.id === 'housing').score, null);
  assert.notStrictEqual(flipped.interventionComparison.find(x => x.id === 'ase').score, null);
  assert.ok(flipped.counterfactual);
  assert.strictEqual(flipped.counterfactual.intervention, 'ase');
  assert.strictEqual(flipped.counterfactual.semantics, 'Controlled scenario evidence; not a production claim.');

  console.log('municipal-production-decision-integrity: PASS phases 1-5');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
