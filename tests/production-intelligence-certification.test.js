'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const PI = require('../js/vidik-production-intelligence');

const CANDIDATES = [
  { id: 'a', name: 'Community violence intervention', domains: ['public-safety'], problemTags: ['violent-crime'], discovery: { leadOnly: true, effectsImported: false, provenance: [{ sourceId: 's1' }] } },
  { id: 'b', name: 'Place-based prevention', domains: ['public-safety'], problemTags: ['violent-crime'], discovery: { leadOnly: true, effectsImported: false, provenance: [{ sourceId: 's2' }] } },
  { id: 'decoy', name: 'Water treatment plant expansion', domains: ['infrastructure'], problemTags: ['unrelated'], decoy: true, discovery: { leadOnly: true, effectsImported: false, provenance: [{ sourceId: 's3' }] } }
];

test('1 automated intervention universe is broad, provenance-aware and effect-free', () => {
  const audit = PI.auditInterventionUniverse({ problem: 'reduce violent crime', candidates: CANDIDATES.slice(0, 2), sourceSearches: [{ sourceId: 's1', status: 'candidates-found' }, { sourceId: 's2', status: 'candidates-found' }], statusQuo: { explicit: true } });
  assert.equal(audit.status, 'found');
  assert.equal(audit.interventionFamilies >= 2, true);
  assert.equal(audit.provenanceGaps, 0);
  assert.equal(audit.effectLeaks, 0);
  assert.equal(audit.recommendationBoundary, 'discovery-only');
});

test('2 evidence reconnaissance cannot promote a lead without exact independent verification', () => {
  const lead = { id: 'lead-1', candidateId: 'a', sourceId: 'study', evidenceLeadOnly: true, causalEffectImported: false, provenance: { externalId: 'x1' } };
  const blocked = PI.auditEvidencePipeline({ candidates: [CANDIDATES[0]], evidenceLeads: [lead], verifications: {}, targetJurisdiction: 'CA' });
  assert.equal(blocked.verifiedParameterCount, 0);
  assert.equal(blocked.promotion['lead-1'].eligible, false);
  const verified = PI.auditEvidencePipeline({ candidates: [CANDIDATES[0]], evidenceLeads: [lead], verifications: { 'lead-1': { verified: true, sourceId: 'study', externalId: 'x1', evidenceType: 'causal', targetJurisdiction: 'CA', sourceJurisdiction: 'CA', localEvidenceBoundary: 'explicit', transportability: { admissible: true }, parameter: { estimate: 0.4, unit: 'outcomes per unit', uncertainty: { low: 0.2, high: 0.6 } }, verifiedEvidence: ['causal', 'implementation', 'cost', 'equity'] } }, targetJurisdiction: 'CA' });
  assert.equal(verified.verifiedParameterCount, 1);
  assert.equal(verified.promotion['lead-1'].eligible, true);
});

test('3 quantitative bridge rejects non-finite inputs and budget violations', () => {
  const good = PI.validateOptimization({ candidates: [CANDIDATES[0]], allocations: { a: 100 }, budget: 100, analysis: { a: { effect: 0.4, resource: 100, uncertainty: { low: 0.2, high: 0.6 } } } });
  assert.equal(good.validated, true);
  const bad = PI.validateOptimization({ candidates: [CANDIDATES[0]], allocations: { a: 101 }, budget: 100, analysis: { a: { effect: Infinity, resource: 100, uncertainty: { low: 0.2, high: 0.6 } } } });
  assert.equal(bad.validated, false);
});

test('4 sensitivity exposes recommendation flips instead of hiding uncertainty', () => {
  const result = PI.buildSensitivityEnvelope({ candidates: [{ id: 'a' }, { id: 'b' }], analysis: { a: { estimate: 0.60, uncertainty: { low: 0.20, high: 0.70 } }, b: { estimate: 0.50, uncertainty: { low: 0.40, high: 0.55 } } } });
  assert.equal(result.stable, true);
  assert.equal(result.recommendation.base, 'a');
  assert.equal(result.recommendation.low, 'b');
  assert.equal(result.recommendationFlip, true);
});

test('5 VOI is explicit and does not fabricate value when inputs are missing', () => {
  const actionable = PI.calculateVOI({ sensitivity: { recommendationFlip: true }, decisionValue: 100, informationCost: 10 });
  assert.equal(actionable.actionable, true);
  assert.equal(actionable.netValueOfInformation, 90);
  const unknown = PI.calculateVOI({ sensitivity: { recommendationFlip: true } });
  assert.equal(unknown.unknownIsNotZero, true);
  assert.equal(unknown.expectedValueOfInformation, null);
});

test('6 decision closure and outcome learning remain immutable and human-reviewed', () => {
  const learning = PI.buildLearningEnvelope({ artifactHash: 'artifact-1', observations: [{ metric: 'incidents', predicted: 100, observed: 90, months: 6 }] });
  assert.equal(learning.observedCount, 1);
  assert.equal(learning.driftSignal, true);
  assert.equal(learning.automaticParameterMutation, false);
  assert.equal(learning.historyImmutable, true);
});

test('7 adversarial tournament rejects unrelated decoys across diverse problems', () => {
  const tournament = PI.runAdversarialTournament({ scenarios: [
    { id: 'crime', problem: 'reduce violent crime', candidates: CANDIDATES },
    { id: 'heat', problem: 'reduce extreme heat illness', candidates: [
      { id: 'cooling', name: 'Cooling centers', domains: ['health'], problemTags: ['extreme-heat'], discovery: { leadOnly: true, effectsImported: false } },
      { id: 'roads', name: 'Road resurfacing', domains: ['transport'], problemTags: ['unrelated'], discovery: { leadOnly: true, effectsImported: false } }
    ] }
  ] });
  assert.equal(tournament.passed, true);
  assert.equal(tournament.results.every(r => r.decoyLeakCount === 0), true);
});

test('full certification reports blockers rather than converting partial work into readiness', () => {
  const certification = PI.certifyDecision({ run: { problem: 'reduce violent crime', candidates: [CANDIDATES[0]], acquisitionSources: [{ sourceId: 's1', status: 'candidates-found' }], evidenceDiscovery: [], governance: { decisionArtifacts: {} }, statusQuo: { explicit: true } } });
  assert.equal(certification.complete, false);
  assert.ok(certification.blockers.includes('decisionArtifact'));
  assert.ok(certification.blockers.includes('quantitativeOptimization'));
});

console.log('VIDIK production intelligence 1-7 certification suite: PASS');
