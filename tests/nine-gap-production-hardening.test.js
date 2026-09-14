'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const F = require('../js/evidence-admissibility-firewall');
const R = require('../js/vidik-resource-optimization');
const T = require('../js/discovery-transfer-intelligence');
const O = require('../js/governed-human-override');

test('1 quality is trusted metadata, not caller admissibility', () => {
  const x = F.enforceEvidenceAdmissibility({ id:'e1', admissible:true, quality:0.2, asOf:'2026-01-01', sourceJurisdiction:'Canada', targetJurisdiction:'Ottawa, Canada', unit:'outcome' }, { expectedJurisdiction:'CA', expectedUnit:'outcome', now:'2026-09-14' });
  assert.equal(x.admissible,false); assert.ok(x.failures.includes('evidence-quality-below-threshold'));
});

test('2 duplicate evidence IDs fail closed', () => {
  const e={id:'same',quality:.95,asOf:'2026-09-01',sourceJurisdiction:'Canada',targetJurisdiction:'Ottawa, Canada',unit:'outcome'};
  const x=F.validateEvidenceSet([e,{...e}],{expectedJurisdiction:'CA',expectedUnit:'outcome',now:'2026-09-14'});
  assert.deepEqual(x.duplicateIds,['same']); assert.equal(x.valid,false);
});

test('3 stale evidence is inadmissible', () => {
  const x=F.enforceEvidenceAdmissibility({id:'old',quality:.95,asOf:'2020-01-01',sourceJurisdiction:'Canada',targetJurisdiction:'Ottawa, Canada',unit:'outcome'},{expectedJurisdiction:'CA',expectedUnit:'outcome',now:'2026-09-14'});
  assert.equal(x.admissible,false); assert.ok(x.failures.includes('evidence-stale'));
});

test('4 missing evidence cannot become a recommendation input', () => {
  const x=F.validateEvidenceSet([],{expectedJurisdiction:'CA',expectedUnit:'outcome'}); assert.equal(x.valid,false);
});

test('5 incompatible resource currency cannot be optimized', () => {
  const models={a:{capacityPerCad:.001,activityPerCapacity:1,effectPerActivity:1,objectiveMetric:'outcome',resourceUnit:'CAD',evidenceIds:['1','2','3']},b:{capacityPerCad:.001,activityPerCapacity:1,effectPerActivity:1,objectiveMetric:'outcome',resourceUnit:'USD',evidenceIds:['4','5','6']}};
  const x=R.evaluateResourceOptimization({marginalUnit:{amount:1000,unit:'CAD'}},[{id:'a',name:'A',status:'ADMISSIBLE'},{id:'b',name:'B',status:'ADMISSIBLE'}],models);
  assert.equal(x.status,'BLOCKED'); assert.equal(x.allocation,null);
});

test('6 human override requires authority, reason and preserves snapshot', () => {
  const d={decisionId:'D1',recommendation:'a',audit:{evidenceHash:'h'}};
  assert.throws(()=>O.requestHumanOverride(d,{actorId:'x',reason:'Local constraint changes allocation.'},{canOverride:false}),/authority/);
  const x=O.requestHumanOverride(d,{actorId:'x',reason:'Local constraint changes allocation.',toRecommendation:'b',timestamp:'2026-09-14T00:00:00Z'},{canOverride:true,role:'authorized'});
  assert.equal(x.decisionState,'RECOMMENDATION_OVERRIDDEN'); assert.equal(x.governanceOverridesAudit.humanOverride.immutableDecisionSnapshotHash.length,64);
});

test('7 partial source failure remains visible and blocks completeness', () => {
  const s=T.buildSearchStrategy('reduce water loss');
  const x=T.auditSearchCoverage(s,[{sourceType:'local-program',sourceId:'l',status:'candidates-found',candidates:[{}]},{sourceType:'official-data',sourceId:'o',status:'failed',failureReason:'timeout',candidates:[]},{sourceType:'research',sourceId:'r',status:'searched-empty',candidates:[]},{sourceType:'intervention-library',sourceId:'i',status:'searched-empty',candidates:[]}]);
  assert.equal(x.complete,false); assert.deepEqual(x.failed,['official-data']); assert.ok(x.notSearched.includes('comparable-city'));
});

test('8 transferability is scored and causal effects are never imported', () => {
  const x=T.assessTransferability({problem:'heat',population:'large',jurisdiction:'CA',institutionalCapacity:'high',implementationEnvironment:'urban',evidenceBase:'trial'},{problem:'heat',population:'large',jurisdiction:'CA',institutionalCapacity:'high',implementationEnvironment:'urban',evidenceBase:'trial'});
  assert.equal(x.effectsImported,false); assert.equal(x.causalEffectTransferred,false); assert.ok(['strong-transfer-lead','transferability-uncertain','requires-local-validation'].includes(x.classification));
});

test('9 wrong-jurisdiction evidence is rejected without any live municipal dependency', () => {
  const x=F.enforceEvidenceAdmissibility({id:'wrong',quality:.95,asOf:'2026-09-01',sourceJurisdiction:'US',targetJurisdiction:'US',unit:'outcome',sourceProfile:{problemDefinition:'x'}},{expectedJurisdiction:'CA',expectedUnit:'outcome',targetProfile:{problemDefinition:'x'}});
  assert.equal(x.admissible,false); assert.ok(x.failures.includes('cross-country-transportability-not-explicitly-approved') || x.failures.includes('jurisdiction-transportability-not-established') || x.failures.includes('transportability-similarity-below-threshold'));
});

console.log('PASS nine-gap-production-hardening battery');
