#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { runAll, runCity } = require('./municipal-production-decision-run');
const { runCanonicalCity, withResourceEnvelope } = require('./municipal-canonical-decision-run');
const { evaluateResourceOptimization, validateModel } = require('../js/vidik-resource-optimization');
const { CANONICAL_18, validateDecisionObject } = require('../js/vidik-architecture-contract');

const HOUSING = { capacityPerCad: 0.000001, activityPerCapacity: 100, effectPerActivity: 0.002, objectiveMetric: 'common_decision_outcome', capacityUnit: 'housing_slots', activityUnit: 'placements', effectUnit: 'common_decision_outcome', evidenceIds: ['resource-capacity:housing','resource-activity:housing','resource-effect:housing'], uncertainty: { low: 0.30, high: 0.50 } };
const ASE = { capacityPerCad: 0.000002, activityPerCapacity: 80, effectPerActivity: 0.004, objectiveMetric: 'common_decision_outcome', capacityUnit: 'enforcement_slots', activityUnit: 'speed_interventions', effectUnit: 'common_decision_outcome', evidenceIds: ['resource-capacity:ase','resource-activity:ase','resource-effect:ase'], uncertainty: { low: 0.20, high: 0.40 } };
const CITIES = ['Ottawa','Toronto','Melbourne'];
const BUDGETS = [1000, 100000, 1000000, 5000000, 25000000, 100000000];
const RESULTS = [];

function pass(id, detail) { RESULTS.push({ id, status: 'PASS', detail }); }
function expectedFailure(id, fn, pattern) { assert.throws(fn, pattern); RESULTS.push({ id, status: 'PASS', detail: `failed closed as expected: ${pattern}` }); }

async function main() {
  // 1. Original production slice: live observation, causal/admissibility, canonical object.
  const baseline = await runAll();
  assert.deepStrictEqual(baseline.cities.map(x => x.city), CITIES);
  assert.strictEqual(baseline.cities.find(x=>x.city==='Ottawa').recommendation, 'housing');
  assert.strictEqual(baseline.cities.find(x=>x.city==='Toronto').recommendation, 'housing');
  assert.strictEqual(baseline.cities.find(x=>x.city==='Melbourne').decisionState, 'BLOCKED');
  assert.strictEqual(baseline.cities.find(x=>x.city==='Ottawa').observedContext.value, 2952);
  assert.strictEqual(baseline.cities.find(x=>x.city==='Toronto').observedContext.value, 15400);
  assert.strictEqual(baseline.cities.find(x=>x.city==='Melbourne').observedContext.value, 147);
  pass('municipal-original-production', 'Ottawa/Toronto recommend; Melbourne blocks; live values 2952/15400/147');

  for (const city of CITIES) {
    const decision = await runCanonicalCity(city, withResourceEnvelope({}, 5000000));
    assert.strictEqual(Object.keys(decision).length, CANONICAL_18.length);
    assert.strictEqual(validateDecisionObject(decision).valid, true);
    assert.strictEqual(decision.causalProductionModel.observedMunicipalDataIsNotCausal, true);
    assert.strictEqual(decision.integrity.syntheticEvidenceExcluded, true);
    pass(`canonical-${city}`, '18-part canonical object validates and preserves observed-vs-causal boundary');
  }

  // 2. City perspective: budget sensitivity across six marginal-resource levels.
  for (const amount of BUDGETS) {
    const result = await runAll({ ...withResourceEnvelope({}, amount), resourceModels: { housing: HOUSING, ase: ASE } });
    for (const city of ['Ottawa','Toronto']) {
      const d = result.cities.find(x=>x.city===city);
      assert.strictEqual(d.resourceEnvelope.marginalUnit.amount, amount);
      assert.strictEqual(d.optimization.status, 'OPTIMIZED');
      assert.strictEqual(d.optimization.allocation.intervention, 'housing');
    }
    const mel = result.cities.find(x=>x.city==='Melbourne');
    assert.strictEqual(mel.optimization.status, 'BLOCKED');
    pass(`city-budget-${amount}`, `budget preserved; Ottawa/Toronto optimize; Melbourne remains blocked`);
  }

  // 3. Budget alone never creates causal evidence.
  for (const amount of BUDGETS) {
    const result = await runAll(withResourceEnvelope({}, amount));
    for (const city of result.cities) assert.notStrictEqual(result.cities.find(x=>x.city===city.city).optimization.status, 'OPTIMIZED');
    pass(`budget-without-model-${amount}`, 'money alone cannot manufacture a resource-to-outcome chain');
  }

  // 4. Recommendation sensitivity / competing intervention flip.
  const flip = await runCity('Ottawa', { scenarioEvidence: { Ottawa: { ase: { admissible: true, evidence: { id:'ase-flip', estimate:0.80, unit:'scenario effect', uncertainty:{low:0.70,high:0.90}, jurisdiction:'Ottawa', mode:'scenario' } } } } });
  assert.strictEqual(flip.recommendation, 'ase');
  pass('recommendation-flip', 'explicit competing evidence flips Ottawa recommendation');

  // 5. Transportability sensitivity: evidence unlocks Melbourne only when explicit.
  const locked = await runCity('Melbourne');
  assert.strictEqual(locked.decisionState, 'BLOCKED');
  const unlocked = await runCity('Melbourne', { scenarioEvidence: { Melbourne: { housing: { admissible:true, evidence:{ id:'housing-au', estimate:0.42, unit:'absolute stable-housing probability difference', uncertainty:{low:0.30,high:0.54}, jurisdiction:'Australia', mode:'site-supported-scenario' } } } } });
  assert.strictEqual(unlocked.recommendation, 'housing');
  pass('transportability-boundary', 'Canada evidence stays blocked in Melbourne until explicit Australian evidence is supplied');

  // 6. Learning / drift / recalibration without mutation.
  const close = await runCity('Ottawa', { outcome:{predicted:0.42,observed:0.40,checkpoint:'6-month',provenance:'monster-test'} });
  const drift = await runCity('Ottawa', { outcome:{predicted:0.42,observed:0.30,checkpoint:'6-month',provenance:'monster-test'} });
  assert.strictEqual(close.learning.drift.detected, false);
  assert.strictEqual(drift.learning.drift.detected, true);
  assert.strictEqual(drift.learning.recalibration.application, 'EXPLICIT_PARAMETER_MAPPING');
  pass('learning-drift-recalibration', 'close outcome does not drift; material error raises drift; recalibration is explicit');

  // 7. Resource-chain completeness, objective comparability and competing allocation.
  const complete = evaluateResourceOptimization({marginalUnit:{amount:5000000,unit:'CAD'}}, [{id:'housing',name:'Housing',status:'ADMISSIBLE'},{id:'ase',name:'ASE',status:'ADMISSIBLE'}], {housing:HOUSING,ase:ASE});
  assert.strictEqual(complete.status, 'OPTIMIZED');
  assert.strictEqual(complete.allocation.intervention, 'housing');
  const incomplete = validateModel({id:'housing'}, {...HOUSING,effectPerActivity:undefined});
  assert.strictEqual(incomplete.admissible, false);
  const mismatch = evaluateResourceOptimization({marginalUnit:{amount:5000000,unit:'CAD'}}, [{id:'housing',name:'Housing',status:'ADMISSIBLE'},{id:'ase',name:'ASE',status:'ADMISSIBLE'}], {housing:HOUSING,ase:{...ASE,objectiveMetric:'serious_harm_events'}});
  assert.strictEqual(mismatch.status, 'BLOCKED');
  pass('resource-chain-boundaries', 'complete chain optimizes; missing step blocks; incomparable objectives block');

  // 8. Hostile numeric/resource inputs.
  expectedFailure('invalid-budget-zero', () => withResourceEnvelope({}, 0), /positive-finite/);
  expectedFailure('invalid-budget-negative', () => withResourceEnvelope({}, -1), /positive-finite/);
  expectedFailure('invalid-budget-infinity', () => withResourceEnvelope({}, Infinity), /positive-finite/);
  expectedFailure('invalid-resource-chain-nan', () => validateModel({id:'housing'}, {...HOUSING, capacityPerCad:NaN}), /./);
  expectedFailure('invalid-resource-chain-negative', () => validateModel({id:'housing'}, {...HOUSING, effectPerActivity:-1}), /./);

  // 9. Evidence-conflict / missing-evidence boundaries: explicit withdrawal must fail closed.
  const denied = await runCity('Ottawa', { scenarioEvidence: { Ottawa: { housing: { admissible:false, failure:'evidence-withdrawn' } } } });
  assert.strictEqual(denied.decisionState, 'BLOCKED');
  assert.strictEqual(denied.audit.failureClosed, true);
  pass('evidence-withdrawal', 'explicit withdrawal blocks recommendation rather than silently substituting another claim');

  // 10. Business usage stress: same optimizer, different marginal business objectives.
  const businessModels = {
    safetyProgram: {...HOUSING, objectiveMetric:'business_risk_reduction', evidenceIds:['business-capacity','business-activity','business-effect']},
    lossPrevention: {...ASE, objectiveMetric:'business_risk_reduction', evidenceIds:['loss-capacity','loss-activity','loss-effect']}
  };
  const businessComparison = [
    {id:'safetyProgram',name:'Safety program',status:'ADMISSIBLE'},
    {id:'lossPrevention',name:'Loss prevention',status:'ADMISSIBLE'}
  ];
  const business = evaluateResourceOptimization({marginalUnit:{amount:250000,unit:'CAD'}}, businessComparison, businessModels);
  assert.strictEqual(business.status,'OPTIMIZED');
  assert.ok(business.allocation.intervention);
  assert.strictEqual(business.objectiveMetric,'business_risk_reduction');
  pass('business-resource-allocation', 'engine can optimize a non-municipal objective when supplied with explicit comparable evidence/model');

  // 11. Realtor/developer usage stress: site-development alternatives must share a declared objective.
  const developmentModels = {
    siteA: {...HOUSING, objectiveMetric:'development_feasibility', evidenceIds:['siteA-capacity','siteA-activity','siteA-effect']},
    siteB: {...ASE, objectiveMetric:'development_feasibility', evidenceIds:['siteB-capacity','siteB-activity','siteB-effect']}
  };
  const developmentComparison = [
    {id:'siteA',name:'Site A',status:'ADMISSIBLE'},
    {id:'siteB',name:'Site B',status:'ADMISSIBLE'}
  ];
  const development = evaluateResourceOptimization({marginalUnit:{amount:1000000,unit:'CAD'}}, developmentComparison, developmentModels);
  assert.strictEqual(development.status,'OPTIMIZED');
  assert.strictEqual(development.objectiveMetric,'development_feasibility');
  pass('realtor-developer-resource-allocation', 'engine can compare site alternatives when objective, resource chain and evidence are explicit');

  // 12. Domain safety: the municipal production wrapper must not pretend to be a generic business/development wrapper.
  const domainGap = await runCity('Ottawa');
  assert.strictEqual(domainGap.objective, 'verified-outcome-improvement');
  pass('domain-wrapper-boundary', 'municipal production wrapper remains explicitly municipal; generic domain optimization is tested at engine layer, not mislabeled as municipal production');

  // 13. Counterfactual and audit integrity.
  const canonical = await runCanonicalCity('Ottawa', withResourceEnvelope({ outcome:{predicted:0.42,observed:0.40,provenance:'monster-test'} }, 5000000));
  assert.strictEqual(canonical.counterfactualVault.status,'RECORDED');
  assert.strictEqual(canonical.governanceOverridesAudit.humanOverride,null);
  assert.strictEqual(canonical.outcomeLearningCheckpoints.recalibrationMutatesParametersAutomatically,false);
  assert.ok(canonical.integrity.evidenceHash);
  pass('counterfactual-audit-learning-integrity', 'counterfactual, lineage hash, learning checkpoint and no-auto-mutation invariants hold');

  const summary = {
    schemaVersion:'vidik.monster-test.v1',
    passed: RESULTS.every(x=>x.status==='PASS'),
    testCount: RESULTS.length,
    domains:['municipal','city-budget','business','realtor-developer','adversarial'],
    results:RESULTS
  };
  process.stdout.write(JSON.stringify(summary,null,2)+'\n');
  if(!summary.passed) process.exitCode=1;
}

if(require.main===module) main().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
module.exports={main};
