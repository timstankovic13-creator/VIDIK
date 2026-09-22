'use strict';
const assert = require('node:assert/strict');
const { createDecisionArtifact, validateDecisionArtifact, detectTamper } = require('../src/full-scope/artifact-engine');

const base = {
  problem: 'reduce violent crime',
  statusQuo: { explicit: true, description: 'Current approach continues.' },
  recommendation: { allowed: true, candidateId: 'local-verified' },
  counterfactual: { statusQuoExplicit: true, recommendationEligible: true, effect: 5, resource: 100, effectUnit: 'incidents avoided', resourceUnit: 'staff-hours' },
  evidence: [{id:'e1',sourceId:'a',verified:true},{id:'e2',sourceId:'b',verified:true}],
  parameters: [{id:'p1',effect:5,resource:100}],
  uncertainty: {level:'moderate'},
  opportunityCost: {status:'evaluated'},
  equity: {status:'evaluated'},
  implementation: {status:'evaluated'},
  reviewSchedule: [{at:'6m',purpose:'early outcome review'},{at:'1y',purpose:'annual review'},{at:'2y',purpose:'longer-term review'}],
  governance: {effectsImported:false,comparableCityEffectsImported:false}
};

(async()=>{
  const artifact = await createDecisionArtifact(base);
  assert.equal(artifact.schemaVersion,'vidik.decision-artifact.v1');
  assert(artifact.baselineHash);
  assert.equal(validateDecisionArtifact(artifact).valid,true);
  assert.equal(Object.isFrozen(artifact),true);
  assert.equal(await detectTamper(artifact,artifact.baselineHash),false);

  const tampered = JSON.parse(JSON.stringify(artifact));
  tampered.recommendation.candidateId = 'forged';
  assert.equal(await detectTamper(tampered,artifact.baselineHash),true);

  await assert.rejects(
    () => createDecisionArtifact({...base,reviewSchedule:[{at:'6m',purpose:'x'},{at:'6m',purpose:'duplicate'}]}),
    error => error?.message === 'artifact-review-schedule-invalid'
  );
  await assert.rejects(
    () => createDecisionArtifact({...base,counterfactual:{...base.counterfactual,resource:0}}),
    error => error?.message === 'artifact-counterfactual-invalid'
  );
  await assert.rejects(
    () => createDecisionArtifact({...base,governance:{effectsImported:true}}),
    error => error?.message === 'artifact-imported-effect-forbidden'
  );

  console.log('full-scope artifact engine: PASS (eligibility, counterfactual closure, review integrity, immutable baseline, tamper detection)');
})();
