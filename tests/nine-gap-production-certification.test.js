'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const F = require('../js/evidence-admissibility-firewall');
const R = require('../js/vidik-resource-optimization');
const O = require('../js/governed-human-override');
const T = require('../js/discovery-transfer-intelligence');
const { runCanonicalAll, runCanonicalCity } = require('../scripts/municipal-canonical-decision-run');

const evidence = (id, extra = {}) => ({ id, quality: .95, asOf: '2026-09-01', unit: 'outcome', sourceJurisdiction: 'Canada', targetJurisdiction: 'Ottawa, Canada', ...extra });

test('1-4 evidence firewall enforces quality, duplicates, freshness and missing evidence', () => {
  assert.equal(F.enforceEvidenceAdmissibility(evidence('q', { quality: .2 }), { expectedJurisdiction:'CA', expectedUnit:'outcome', now:'2026-09-14' }).admissible, false);
  assert.ok(F.enforceEvidenceAdmissibility(evidence('s', { asOf:'2020-01-01' }), { expectedJurisdiction:'CA', expectedUnit:'outcome', now:'2026-09-14' }).failures.includes('evidence-stale'));
  const dup=F.validateEvidenceSet([evidence('d'),evidence('d')], { expectedJurisdiction:'CA', expectedUnit:'outcome', now:'2026-09-14' });
  assert.deepEqual(dup.duplicateIds,['d']); assert.equal(dup.valid,false);
  assert.equal(F.validateEvidenceSet([],{}).valid,false);
});

test('5 resource optimization rejects incompatible currencies and duplicate lineage', () => {
  const base={capacityPerCad:.001,activityPerCapacity:1,effectPerActivity:1,objectiveMetric:'outcome',evidenceIds:['1','2','3']};
  const x=R.evaluateResourceOptimization({marginalUnit:{amount:1000,unit:'CAD'}},[{id:'a',name:'A',status:'ADMISSIBLE'},{id:'b',name:'B',status:'ADMISSIBLE'}],{a:{...base,resourceUnit:'CAD'},b:{...base,resourceUnit:'USD'}});
  assert.equal(x.status,'BLOCKED');
  assert.equal(R.validateModel({id:'a'},{...base,evidenceIds:['x','x','x']},'CAD').admissible,false);
});

test('6 human override is explicit, authorized and auditable', () => {
  const d={decisionId:'D9',recommendation:'a',audit:{evidenceHash:'before'}};
  assert.throws(()=>O.requestHumanOverride(d,{actorId:'actor',reason:'Local constraint requires change.'},{canOverride:false}),/authority/);
  const x=O.requestHumanOverride(d,{actorId:'actor',reason:'Local constraint requires change.',toRecommendation:'b',timestamp:'2026-09-14T00:00:00Z'},{canOverride:true,role:'authorized-decision-maker'});
  assert.equal(x.decisionState,'RECOMMENDATION_OVERRIDDEN'); assert.equal(x.governanceOverridesAudit.humanOverride.originalEvidenceHash,'before');
});

test('7 partial source failure remains isolated in canonical three-city execution', async () => {
  const result=await runCanonicalAll();
  assert.equal(result.cities.length,3);
  assert.equal(result.acceptance.partialFailureIsolation,true);
});

test('8 transferability is multi-dimensional and never imports causal effects', () => {
  const x=T.assessTransferability({problem:'heat',population:'large',jurisdiction:'US',institutionalCapacity:'high',implementationEnvironment:'urban',evidenceBase:'trial'}, {problem:'heat',population:'large',jurisdiction:'CA',institutionalCapacity:'high',implementationEnvironment:'urban',evidenceBase:'trial'});
  assert.equal(x.causalEffectTransferred,false); assert.equal(x.effectsImported,false); assert.ok(x.mismatched>=1);
});

test('9 wrong-jurisdiction evidence fails independently of municipal availability', () => {
  const x=F.enforceEvidenceAdmissibility(evidence('wrong',{sourceJurisdiction:'United States',targetJurisdiction:'United States'}), {expectedJurisdiction:'CA',expectedUnit:'outcome',targetProfile:{problemDefinition:'unrelated'},now:'2026-09-14'});
  assert.equal(x.admissible,false);
  assert.ok(x.failures.includes('cross-country-transportability-not-explicitly-approved') || x.failures.includes('jurisdiction-transportability-not-established'));
});

test('production certification: canonical decision path remains intact after hardening controls', async () => {
  const r=await runCanonicalCity('Ottawa');
  assert.equal(r.identityBrief?.city,'Ottawa');
  assert.equal(r.causalProductionModel?.observedMunicipalDataIsNotCausal,true);
  assert.equal(r.integrity?.syntheticEvidenceExcluded,true);
});
