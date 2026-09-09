'use strict';

const assert = require('assert');
const { CANONICAL_18 } = require('../js/vidik-architecture-contract');
const { runCanonicalAll, withResourceEnvelope, runCanonicalCity } = require('../scripts/municipal-canonical-decision-run');

const RESOURCE_MODELS = {
  housing: {
    capacityPerCad: 0.000001,
    activityPerCapacity: 100,
    effectPerActivity: 0.002,
    objectiveMetric: 'common_decision_outcome',
    capacityUnit: 'housing_slots',
    activityUnit: 'placements',
    effectUnit: 'common_decision_outcome',
    evidenceIds: ['resource-capacity:housing', 'resource-activity:housing', 'resource-effect:housing'],
    uncertainty: { low: 0.30, high: 0.50 },
    marginalEvidence: {
      evidenceId: 'resource-marginal:housing:architecture-validation',
      provenance: 'architecture-validation-decision-specific-marginal-resource-model',
      uncertainty: { low: 0.30, high: 0.50 },
      transportability: { admissible: true, similarity: 1.0 },
      sourceJurisdiction: 'Canada',
      targetJurisdiction: 'Canada'
    }
  }
};

function assertCanonicalShape(decision) {
  assert.strictEqual(Object.keys(decision).length, CANONICAL_18.length);
  for (const part of CANONICAL_18) assert.ok(Object.prototype.hasOwnProperty.call(decision, part), `missing canonical part: ${part}`);
  assert.strictEqual(decision.identityBrief.immutableSnapshot, true);
  assert.strictEqual(decision.integrity.decisionIntegrity, true);
  assert.strictEqual(decision.integrity.reproducibleRun, true);
  assert.strictEqual(decision.integrity.syntheticEvidenceExcluded, true);
  assert.strictEqual(decision.outcomeLearningCheckpoints.syntheticDefaultLearning, false);
  assert.strictEqual(decision.causalProductionModel.observedMunicipalDataIsNotCausal, true);
}

function assertObservationLineage(decision) {
  const nodes = decision.evidenceGraph.nodes;
  const municipal = nodes.find(node => node.id === `municipal:${decision.identityBrief.city}`);
  assert.ok(municipal, `${decision.identityBrief.city}: missing municipal evidence node`);
  assert.ok(municipal.provenance.sourceUrl, `${decision.identityBrief.city}: missing municipal source provenance`);
  assert.ok(decision.evidenceGraph.lineage.some(x => x.evidenceId === `municipal:${decision.identityBrief.city}:housing.need`), `${decision.identityBrief.city}: missing municipal lineage`);
}

function assertRecommendationBoundary(decision, expectedRecommendation) {
  assert.strictEqual(decision.rationale.recommendation, expectedRecommendation);
  assert.strictEqual(decision.interventionUniverse.interventions.length, 3);
  assert.ok(decision.interventionUniverse.interventions.some(x => x.id === 'housing'));
  assert.ok(decision.interventionUniverse.interventions.some(x => x.id === 'ase'));
  if (expectedRecommendation === null) {
    assert.strictEqual(decision.driftFailureRegistry.failureClosed, true);
    assert.strictEqual(decision.counterfactualVault.status, 'NOT_ESTIMABLE');
  } else {
    assert.strictEqual(decision.counterfactualVault.status, 'RECORDED');
    assert.ok(decision.parameters.selected);
    assert.ok(decision.parameters.selected.evidenceIds.length >= 1);
    assert.ok(decision.uncertaintyBudget.parameters.length >= 1);
  }
}

(async () => {
  const baseline = await runCanonicalAll(withResourceEnvelope({}, 5000000));
  assert.strictEqual(baseline.cities.length, 3);
  const baselineByCity = Object.fromEntries(baseline.cities.map(x => [x.identityBrief.city, x]));

  assertCanonicalShape(baselineByCity.Ottawa);
  assertCanonicalShape(baselineByCity.Toronto);
  assertCanonicalShape(baselineByCity.Melbourne);
  for (const city of ['Ottawa', 'Toronto', 'Melbourne']) assertObservationLineage(baselineByCity[city]);

  assertRecommendationBoundary(baselineByCity.Ottawa, 'housing');
  assertRecommendationBoundary(baselineByCity.Toronto, 'housing');
  assertRecommendationBoundary(baselineByCity.Melbourne, null);

  for (const city of ['Ottawa', 'Toronto']) {
    assert.strictEqual(baselineByCity[city].resourceEnvelope.marginalUnit.amount, 5000000);
    assert.strictEqual(baselineByCity[city].optimizationOpportunityCost.status, 'BLOCKED_MISSING_MARGINAL_EVIDENCE');
    assert.strictEqual(baselineByCity[city].causalProductionModel.resourceTranslation.status, 'BLOCKED_MISSING_MARGINAL_EVIDENCE');
  }
  assert.strictEqual(baselineByCity.Melbourne.resourceEnvelope.marginalUnit.amount, 5000000);
  assert.strictEqual(baselineByCity.Melbourne.optimizationOpportunityCost.status, 'BLOCKED_MISSING_MARGINAL_EVIDENCE');
  assert.strictEqual(baselineByCity.Melbourne.causalProductionModel.resourceTranslation.status, 'BLOCKED_MISSING_MARGINAL_EVIDENCE');
  assert.strictEqual(baselineByCity.Melbourne.driftFailureRegistry.failureClosed, true);

  const activated = await runCanonicalAll({
    ...withResourceEnvelope({}, 5000000),
    resourceModels: RESOURCE_MODELS
  });
  const activatedByCity = Object.fromEntries(activated.cities.map(x => [x.identityBrief.city, x]));

  for (const city of ['Ottawa', 'Toronto']) {
    const decision = activatedByCity[city];
    assert.strictEqual(decision.optimizationOpportunityCost.status, 'OPTIMIZED');
    assert.strictEqual(decision.optimizationOpportunityCost.allocation.intervention, 'housing');
    assert.strictEqual(decision.causalProductionModel.resourceTranslation.status, 'OPTIMIZED');
    assert.strictEqual(decision.resourceEnvelope.optimizationStatus, 'OPTIMIZED');
    assert.match(decision.resourceEnvelope.feedback, /resource -> capacity -> activity -> expected outcome/i);
    assert.ok(decision.evidenceGraph.nodes.some(node => node.kind === 'resource_chain'));
    assert.strictEqual(decision.rationale.resourceDecision, decision.resourceEnvelope.feedback);
    assert.strictEqual(decision.optimizationOpportunityCost.feedback, decision.resourceEnvelope.feedback);
    assert.strictEqual(decision.reoptimizationExecutionReadiness.reoptimization, 'resource-allocation-computed');
  }

  assert.strictEqual(activatedByCity.Melbourne.optimizationOpportunityCost.status, 'BLOCKED');
  assert.strictEqual(activatedByCity.Melbourne.optimizationOpportunityCost.allocation, null);
  assert.strictEqual(activatedByCity.Melbourne.driftFailureRegistry.failureClosed, true);
  assert.strictEqual(activatedByCity.Melbourne.interventionUniverse.interventions.find(x => x.id === 'housing').status, 'BLOCKED');

  const learningRun = await runCanonicalCity('Ottawa', {
    ...withResourceEnvelope({}, 5000000),
    outcome: { observed: 0.40, predicted: 0.42, provenance: 'architecture-validation-observed-outcome' },
    resourceModels: RESOURCE_MODELS
  });
  assert.ok(learningRun.outcomeLearningCheckpoints.current);
  assert.strictEqual(learningRun.outcomeLearningCheckpoints.current.outcome.error, -0.019999999999999962);
  assert.strictEqual(learningRun.outcomeLearningCheckpoints.recalibrationMutatesParametersAutomatically, false);

  assert.throws(() => withResourceEnvelope({}, 0), /positive-finite/);
  assert.throws(() => withResourceEnvelope({}, Infinity), /positive-finite/);

  console.log('VIDIK three-city architecture validation: PASS');
  console.log('Cities: Ottawa=RECOMMENDATION, Toronto=RECOMMENDATION, Melbourne=BLOCKED');
  console.log('Canonical parts validated: 18 per city');
  console.log('Resource feedback: Ottawa/Toronto OPTIMIZED with evidenced chain; Melbourne BLOCKED');
  console.log('Learning: explicit observed outcome; automatic parameter mutation prohibited');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
