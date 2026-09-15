'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const P = require('../js/production-decision-pipeline');

const statusQuo = { explicit: true, description: 'current municipal approach' };

function verifiedLead(id = 'e:1') {
  return { id, candidateId: 'c1', sourceId: 'openalex-works', evidenceLeadOnly: true, causalEffectImported: false, provenance: { externalId: id } };
}
function verification(externalId = 'e:1') {
  return { verified: true, verificationId: 'v1', sourceId: 'openalex-works', externalId, evidenceType: 'causal', sourceJurisdiction: 'international', targetJurisdiction: 'Ottawa, Canada', localEvidenceBoundary: 'explicit', transportability: { admissible: true }, verifiedEvidence: ['causal','implementation','cost','equity'], parameter: { estimate: .42, unit: 'risk ratio', uncertainty: { low: .31, high: .56 } } };
}

test('Engine 1: discovery leads cross the promotion gate only with exact independent verification', () => {
  const blocked = P.promoteDiscoveryLeads({ discovery: { discoveryHash: 'd1', evidenceLeads: [verifiedLead()] }, targetJurisdiction: 'Ottawa, Canada' });
  assert.equal(blocked.promotedCount, 0);
  assert.ok(blocked.blocked[0].reasons.includes('independent-verification-missing'));
  const promoted = P.promoteDiscoveryLeads({ discovery: { discoveryHash: 'd1', evidenceLeads: [verifiedLead()] }, verificationByEvidenceId: { 'e:1': verification() }, targetJurisdiction: 'Ottawa, Canada' });
  assert.equal(promoted.promotedCount, 1);
  assert.equal(promoted.recommendationEligible, false);
  assert.equal(promoted.effectsImported, false);
});

test('Engine 2: comparable-city evidence produces transfer leads but never local causal effects', () => {
  const result = P.assessComparableCityTransfer({ problem: 'pedestrian injuries', population: 'large urban', institutionalCapacity: 'high', implementationEnvironment: 'urban', jurisdiction: 'Ottawa' }, [{ city: 'Toronto', jurisdiction: 'Toronto', intervention: 'traffic calming', matchedSignals: ['traffic-injury'], provenance: { source: 'city-study' }, population: 'large urban', institutionalCapacity: 'high', implementationEnvironment: 'urban' }]);
  assert.equal(result.results[0].classification, 'transferable-with-local-validation');
  assert.equal(result.results[0].causalEffectTransferred, false);
  assert.equal(result.evidenceImported, false);
});

test('Engine 3: the existing artifact store remains the persistence and integrity boundary', () => {
  const result = P.runEngine({ problem: 'pedestrian injuries', acquisitionSources: [{ sourceId: 'local', sourceType: 'local-program', status: 'searched', candidatesReturned: 1 }], localCandidates: [{ id: 'traffic-calming', name: 'Traffic calming', problemTags: ['traffic-injury'], domains: ['transport'], requiredEvidence: ['causal'] }], evidenceIndex: { 'traffic-calming': { causal: { status: 'verified' } } }, analysisInputs: {}, statusQuo, decisionContext: { jurisdiction: 'Ottawa' } });
  assert.equal(result.artifact.schema, 'VIDIK.DecisionArtifact.v1');
  assert.ok(result.artifact.integrity.contentHash);
  assert.equal(require('../js/decision-artifact-store').verifyArtifact(result.artifact).ok, true);
  assert.ok(result.pipelineHash);
});

test('Engine 4: outcome review anchors to the immutable decision hash and cannot rewrite history', () => {
  const artifact = P.runEngine({ problem: 'pedestrian injuries', acquisitionSources: [{ sourceId: 'local', sourceType: 'local-program', status: 'searched', candidatesReturned: 1 }], localCandidates: [{ id: 'traffic-calming', name: 'Traffic calming', problemTags: ['traffic-injury'], domains: ['transport'], requiredEvidence: ['causal'] }], evidenceIndex: { 'traffic-calming': { causal: { status: 'verified' } } }, statusQuo, decisionContext: { jurisdiction: 'Ottawa' } }).artifact;
  const review = P.recordOutcomeReview({ decisionArtifact: artifact, checkpoint: '1-year', predicted: 10, observed: 13 });
  assert.equal(review.baselineDecisionHash, artifact.integrity.contentHash);
  assert.equal(review.deviation, 3);
  assert.equal(review.historyRewrite, false);
  assert.equal(review.automaticParameterMutation, false);
});

test('Engine 5: stale, failed, unknown and incomplete states close the recommendation path', () => {
  const result = P.evaluateOperationalState({ sourceSearches: [{ sourceId: 'city', status: 'search-failed' }, { sourceId: 'research', status: 'stale', freshness: { status: 'stale' } }], candidates: [{ id: 'x', evidenceState: 'evidence-gap', effectUnknown: true }], evidence: [{ status: 'conflicting' }], analysis: { status: 'blocked' }, statusQuo: { explicit: false } });
  assert.equal(result.safeToRecommend, false);
  assert.equal(result.recommendationEligible, false);
  assert.deepEqual(result.blockers, ['source-failed','source-stale','evidence-insufficient','evidence-conflicting','effect-unknown','quantification-incomplete','status-quo-not-explicit']);
  assert.equal(result.unknownIsNotZero, true);
});

test('Engine 6: readiness reports all six engine workstreams without pretending GUI state is engine readiness', () => {
  const result = P.buildProductionReadiness({ discoveryComplete: true, evidenceVerified: true, parametersAdmissible: true, optimizationValid: true, decisionArtifactPersisted: true, outcomeLearningReady: true, operationalGate: { safeToRecommend: true } });
  assert.equal(result.passed, 6);
  assert.equal(result.total, 6);
  assert.equal(result.complete, true);
  assert.equal(result.releaseRecommendation, 'eligible-for-human-decision');
});

test('generalization: novel problem with no candidates remains blocked rather than borrowing a catalogue answer', () => {
  const result = P.runEngine({ problem: 'worker displacement from automation', acquisitionSources: [{ sourceId: 'research', sourceType: 'research', status: 'searched-empty', candidatesReturned: 0 }], statusQuo, decisionContext: { jurisdiction: 'Ottawa' } });
  assert.equal(result.run.candidates.length, 0);
  assert.equal(result.operational.safeToRecommend, false);
  assert.equal(result.run.decision.recommendation, null);
});
