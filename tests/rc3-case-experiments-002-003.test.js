'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const rc3 = require('../js/rc3-decision-experiment');

describe('RC3 real-case experiment controls', () => {
  it('Case 002 cannot become executable without a defensible marginal exposure', () => {
    const input = {
      candidateId: 'ASE_EXPANSION_2024',
      decisionId: 'RC1-002',
      historicalDecisionHash: 'git:fee012fab5c2a4437f0a63c754e1ce70a9f3b696',
      resourceUnit: null,
      problem: 'speed-related serious road safety harm',
      baseline: { source: 'historical Case 002 dossier' },
      intervention: 'automated speed enforcement',
      marginalResource: { status: 'not identified' },
      mechanism: 'speed deterrence',
      predictedOutcome: { status: 'not registered' },
      counterfactual: { status: 'not defensible for marginal candidate' },
      alternatives: ['status quo', 'other road-safety interventions'],
      uncertainty: { status: 'material unresolved uncertainty' },
      successFailureThresholds: { status: 'not registered' },
      measurementPlan: { status: 'not registered' }
    };
    assert.throws(() => rc3.createDecisionExperimentContract(input), /resourceUnit/);
  });

  it('Case 003 supports a genuine prospective contract without inventing an effect size', () => {
    const base = rc3.createDecisionExperimentContract({
      candidateId: 'PARAMEDIC_CAPACITY_2024',
      decisionId: 'RC3-003-PROSPECTIVE',
      historicalDecisionHash: 'git:fee012fab5c2a4437f0a63c754e1ce70a9f3b696',
      resourceUnit: 'deployable paramedic crew-hours',
      problem: 'emergency response reliability',
      baseline: { measures: ['response-time target attainment', 'Level Zero', 'offload delay'] },
      intervention: 'incremental deployable paramedic capacity',
      marginalResource: { unit: 'deployable paramedic crew-hours', costTrackedSeparately: true },
      mechanism: 'increased ambulance availability and reduced response delay',
      predictedOutcome: { direction: 'improvement', numericEffect: null },
      counterfactual: { status: 'registered prospectively before outcomes' },
      alternatives: ['status quo', 'reallocation to another service configuration'],
      uncertainty: { correlated: ['demand', 'offload', 'fleet', 'dispatch', 'concurrent interventions'] },
      successFailureThresholds: { success: 'pre-specified improvement against defensible counterfactual', failure: 'no improvement or adverse effect', inconclusive: 'unreliable outcome/exposure measurement' },
      measurementPlan: { primary: 'share of eligible high-priority calls meeting response-time target', secondary: ['Level Zero minutes', 'response-time distribution', 'offload delay', 'serious outcomes'] }
    });
    const frozen = rc3.freezePrediction(base, {
      effect: { direction: 'improvement', numericEffect: null },
      primaryOutcome: 'share of eligible high-priority calls meeting the registered response-time target',
      evaluationMethod: 'QUASI_EXPERIMENTAL',
      successThreshold: 'pre-specified improvement against defensible counterfactual with registered uncertainty criterion'
    });
    assert.equal(frozen.predictionFreeze.frozen, true);
    assert.equal(frozen.predictionFreeze.effect.numericEffect, null);
    assert.equal(frozen.historicalDecisionHash, 'git:fee012fab5c2a4437f0a63c754e1ce70a9f3b696');
  });

  it('Case 003 remains ineligible for outcome conclusions until counterfactual, spillover and execution controls are populated', () => {
    const base = rc3.createDecisionExperimentContract({
      candidateId: 'PARAMEDIC_CAPACITY_2024', decisionId: 'RC3-003-GATE',
      historicalDecisionHash: 'git:fee012fab5c2a4437f0a63c754e1ce70a9f3b696', resourceUnit: 'deployable paramedic crew-hours',
      problem: 'response reliability', baseline: { registered: true }, intervention: 'incremental paramedic capacity', marginalResource: { unit: 'deployable paramedic crew-hours' },
      mechanism: 'availability', predictedOutcome: { direction: 'improvement' }, counterfactual: { registered: true }, alternatives: ['status quo'], uncertainty: { registered: true },
      successFailureThresholds: { registered: true }, measurementPlan: { registered: true }
    });
    const frozen = rc3.freezePrediction(base, { effect: { direction: 'improvement' }, primaryOutcome: 'response target attainment', evaluationMethod: 'QUASI_EXPERIMENTAL', successThreshold: 'improvement vs counterfactual' });
    const gate = rc3.validateRC3(frozen);
    assert.equal(gate.eligible, false);
    assert(gate.failures.includes('counterfactual-design-missing'));
    assert(gate.failures.includes('spillover-assessment-missing'));
    assert(gate.failures.includes('stop-rules-missing'));
    assert(gate.failures.includes('human-decision-separation-missing'));
  });
});
