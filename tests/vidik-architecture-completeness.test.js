'use strict';

const assert = require('assert');
const { CANONICAL_18, LEARNING_CHECKPOINTS, CONCEPTS, validateDecisionObject } = require('../js/vidik-architecture-contract');
const { DIMENSIONS, similarityScore, rankComparableCities, buildAcquisitionQueue } = require('../js/comparable-city-evidence');

const decision = Object.fromEntries(CANONICAL_18.map(part => [part, {}]));
decision.identityBrief = { decisionId: 'decision-test-001', version: 1 };
decision.resourceEnvelope = { marginalUnit: { amount: 100000, unit: 'CAD' } };
decision.interventionUniverse = { interventions: [{ id: 'housing' }, { id: 'ase' }] };
decision.evidenceGraph = { nodes: [] };
decision.claimScaledEvidence = { claims: [] };
decision.uncertaintyBudget = { parameters: [] };
decision.outcomeLearningCheckpoints = { checkpoints: [...LEARNING_CHECKPOINTS] };

assert.strictEqual(validateDecisionObject(decision).valid, true);
assert.strictEqual(CANONICAL_18.length, 18);
assert.deepStrictEqual(LEARNING_CHECKPOINTS, ['6-month', '1-year', '2-year', '5-year']);
for (const key of [
  'claimScaledEvidence','minimumSufficientEvidence','causalAdmissibility','transportability',
  'marginalResourceOptimization','opportunityCost','uncertaintyBudget','voi','sensitivityFlip',
  'counterfactualDesign','executionReadiness','evidenceAcquisition','semanticMunicipalMapping',
  'provenanceFreshness','failureClosed','outcomeLearning','recalibrationNoMutation','driftDetection',
  'decisionIntegrity','humanOverride','governanceAudit','immutableIdentity','counterfactualVault',
  'failureRegistry','syntheticDecisionLab','evidenceUniverse','threeCityProduction','comparableCityAcquisition'
]) assert.ok(CONCEPTS[key], `missing concept contract: ${key}`);

const target = Object.fromEntries(DIMENSIONS.map(d => [d, d === 'jurisdiction' ? 'CA' : 'same']));
const candidates = [
  { city: 'Comparable Conventional', profile: target, evidenceQuality: .8, outcomeMatch: .8, evidenceIds: ['e1'] },
  { city: 'Comparable Unconventional', profile: target, evidenceQuality: .8, outcomeMatch: .8, evidenceIds: ['e2'], approach: { unconventional: true, name: 'unconventional-approach' } },
  { city: 'Distant', profile: { ...target, jurisdiction: 'AU', populationScale: 'different' }, evidenceQuality: .2, outcomeMatch: .2, evidenceIds: ['e3'] }
];

assert.strictEqual(similarityScore(target, candidates[0].profile), 1);
const ranked = rankComparableCities(target, candidates);
assert.strictEqual(ranked[0].city, 'Comparable Conventional');
assert.ok(ranked.some(x => x.unconventional));
assert.strictEqual(ranked.find(x => x.unconventional).admissibility.status, 'NOT_ESTABLISHED');
assert.match(ranked.find(x => x.unconventional).admissibility.reason, /not[- ]causal[- ]admissibility/);

const queue = buildAcquisitionQueue({ city: 'Melbourne', ...target }, candidates);
assert.strictEqual(queue[0].rank, 1);
assert.ok(queue.find(x => x.unconventional).nextStep.includes('transfer conditions'));

console.log('VIDIK architecture completeness: PASS');
console.log(`Canonical parts: ${CANONICAL_18.length}`);
console.log(`Concept contracts: ${Object.keys(CONCEPTS).length}`);
console.log(`Comparable-city candidates ranked: ${ranked.length}`);
