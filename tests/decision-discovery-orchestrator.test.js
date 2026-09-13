'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const {
  SOURCE_TYPES,
  buildDiscoveryRun,
  comparableCityLeads,
  deduplicateCandidates,
  buildSearchManifest,
  runUncertaintySensitivityVOI,
  buildDecisionArtifact,
  persistDecisionArtifact
} = require('../js/decision-discovery-orchestrator');
const ArtifactStore = require('../js/decision-artifact-store');

test('arbitrary problem records the complete discovery path without fabrication', () => {
  const run = buildDiscoveryRun({
    problem: 'reduce violent crime',
    acquisitionSources: [
      { sourceId: 'municipal-programs', sourceType: 'local-program', status: 'searched', candidatesReturned: 2, query: 'violent crime', provenance: { url: 'official://municipal-programs' } },
      { sourceId: 'research-discovery', sourceType: 'research', status: 'searched', candidatesReturned: 1 },
      { sourceId: 'official-data', sourceType: 'official-data', status: 'searched', candidatesReturned: 3 },
      { sourceId: 'intervention-library', sourceType: 'intervention-library', status: 'searched', candidatesReturned: 4 }
    ],
    localCandidates: [
      { id: 'violence-interruption', name: 'Violence interruption', problemTags: ['violent-crime'], domains: ['public-safety'], requiredEvidence: ['causal', 'implementation'] },
      { id: 'unrelated', name: 'Street beautification', problemTags: ['aesthetics'], domains: ['environment'], requiredEvidence: ['causal'] }
    ],
    researchLeads: [{ id: 'research-1', title: 'Community violence intervention', problemTags: ['violent-crime'], domains: ['public-safety'], evidenceStatus: 'potential' }],
    comparableCities: [{ city: 'Toronto', problem: 'violent crime', interventions: 'violence interruption', provenance: { source: 'city-program' } }],
    evidenceIndex: { 'violence-interruption': { causal: { status: 'verified' }, implementation: { status: 'verified' } } }
  });

  assert.equal(run.schemaVersion, 'vidik.decision-discovery.v2');
  assert.equal(run.discoveryAudit.problem, 'reduce violent crime');
  assert.ok(run.discoveryAudit.candidatesConsidered >= 2);
  assert.ok(run.discoveryAudit.candidatesMatched >= 1);
  const searchedTypes = run.discoveryAudit.sourceSearches.map(search => search.sourceType);
  assert.ok(searchedTypes.includes('local-program'));
  assert.ok(searchedTypes.includes('research'));
  assert.ok(searchedTypes.includes('official-data'));
  assert.ok(searchedTypes.includes('intervention-library'));
  assert.ok(searchedTypes.includes('comparable-city'));
  assert.equal(run.governance.unknownIsNotZero, true);
  assert.equal(run.governance.effectsImportedFromComparableCities, false);
  assert.equal(run.candidates.find(item => item.id === 'violence-interruption').evidenceState, 'evidence-complete');
  assert.equal(run.governance.recommendationAllowed, false, 'VOI/sensitivity must still run before recommendation permission');
  assert.equal(typeof run.runHash, 'string');
  assert.equal(run.runHash.length, 64);
});

test('unseen problem produces explicit searched no-candidate state rather than a fabricated option', () => {
  const run = buildDiscoveryRun({
    problem: 'improve public library wait times',
    acquisitionSources: [
      { sourceId: 'municipal-programs', sourceType: 'local-program', status: 'searched', candidatesReturned: 0 },
      { sourceId: 'research-discovery', sourceType: 'research', status: 'searched', candidatesReturned: 0 },
      { sourceId: 'official-data', sourceType: 'official-data', status: 'searched', candidatesReturned: 0 },
      { sourceId: 'intervention-library', sourceType: 'intervention-library', status: 'searched', candidatesReturned: 0 }
    ]
  });
  assert.equal(run.candidates.length, 0);
  assert.equal(run.discoveryAudit.emptyResult, true);
  assert.equal(run.discoveryAudit.status, 'no-candidates-found');
  assert.equal(run.discoveryAudit.candidatesConsidered, 0);
  assert.equal(run.governance.noCandidatesFound, true);
  assert.equal(run.governance.recommendationAllowed, false);
  assert.equal(run.analysis.status, 'blocked');
});

test('source search failure is not treated as an empty successful search', () => {
  const run = buildDiscoveryRun({
    problem: 'reduce violent crime',
    acquisitionSources: [
      { sourceId: 'research-discovery', sourceType: 'research', status: 'search-failed', candidatesReturned: 0, failureReason: 'upstream-timeout' },
      { sourceId: 'municipal-programs', sourceType: 'local-program', status: 'searched', candidatesReturned: 1 },
      { sourceId: 'official-data', sourceType: 'official-data', status: 'searched', candidatesReturned: 1 },
      { sourceId: 'intervention-library', sourceType: 'intervention-library', status: 'searched', candidatesReturned: 1 }
    ],
    localCandidates: [{ id: 'local-violence', name: 'Violence interruption', problemTags: ['violent-crime'], domains: ['public-safety'], requiredEvidence: ['causal'] }],
    evidenceIndex: { 'local-violence': { causal: { status: 'verified' } } }
  });
  assert.deepEqual(run.governance.sourceSearchFailures, ['research-discovery']);
  assert.equal(run.governance.recommendationAllowed, false);
  assert.equal(run.discoveryAudit.discoverySearchComplete, false);
  const researchSearch = run.discoveryAudit.sourceSearches.find(search => search.sourceId === 'research-discovery');
  assert.equal(researchSearch.status, 'search-failed');
  assert.equal(researchSearch.failureReason, 'upstream-timeout');
});

test('every required source type is explicitly recorded, including not-searched', () => {
  const manifest = buildSearchManifest({ problem: 'reduce flood damage' });
  assert.deepEqual(SOURCE_TYPES, ['local-program', 'official-data', 'research', 'intervention-library', 'comparable-city']);
  assert.deepEqual(manifest.map(item => item.sourceType).sort(), SOURCE_TYPES.slice().sort());
  assert.ok(manifest.every(item => item.status === 'not-searched'));
});

test('candidate deduplication merges semantic duplicates while preserving provenance', () => {
  const candidates = deduplicateCandidates([
    { id: 'a', name: 'Community violence intervention', problemTags: ['violent-crime'], domains: ['public-safety'], discovery: { source: 'city-a', sourceType: 'local-program', provenance: [{ sourceId: 'city-a', sourceType: 'local-program' }] } },
    { id: 'b', name: 'Community violence intervention', problemTags: ['violent-crime'], domains: ['health'], discovery: { source: 'study-b', sourceType: 'research', provenance: [{ sourceId: 'study-b', sourceType: 'research' }] } }
  ]);
  assert.equal(candidates.length, 1);
  assert.deepEqual(candidates[0].domains.sort(), ['health', 'public-safety']);
  assert.deepEqual(candidates[0].discovery.provenance.map(item => item.sourceId).sort(), ['city-a', 'study-b']);
});

test('provenance cannot be flattened into a generic fallback source', () => {
  const run = buildDiscoveryRun({
    problem: 'reduce violent crime',
    acquisitionSources: [
      { sourceId: 'official-data', sourceType: 'official-data', status: 'searched', candidatesReturned: 1 },
      { sourceId: 'research', sourceType: 'research', status: 'searched', candidatesReturned: 1 },
      { sourceId: 'interventions', sourceType: 'intervention-library', status: 'searched', candidatesReturned: 1 },
      { sourceId: 'local', sourceType: 'local-program', status: 'searched', candidatesReturned: 1 }
    ],
    localCandidates: [{ id: 'same', name: 'Violence interruption', problemTags: ['violent-crime'], requiredEvidence: ['causal'], discovery: { source: 'local', sourceType: 'local-program' } }],
    researchLeads: [{ id: 'research-same', title: 'Violence interruption', problemTags: ['violent-crime'], requiredEvidence: ['causal'], discovery: { source: 'research', sourceType: 'research' } }],
    evidenceIndex: { same: { causal: { status: 'verified' } } }
  });
  const candidate = run.candidates.find(item => item.name === 'Violence interruption');
  assert.ok(candidate);
  assert.notEqual(candidate.discovery.sourceType, 'fallback-registry');
  assert.ok(candidate.discovery.provenance.length >= 1);
});

test('comparable cities are transferability leads, never effect imports', () => {
  const leads = comparableCityLeads({
    problem: 'reduce emergency department overcrowding',
    cities: [
      { city: 'Toronto', problem: 'emergency department overcrowding', interventions: 'community paramedicine' },
      { city: 'Melbourne', problem: 'emergency department overcrowding', interventions: 'hospital at home' },
      { city: 'Ottawa', problem: 'road safety', interventions: 'speed management' }
    ]
  });
  assert.deepEqual(leads.map(item => item.city).sort(), ['Melbourne', 'Toronto']);
  assert.ok(leads.every(item => item.leadOnly === true));
  assert.ok(leads.every(item => item.effectsImported === false));
});

test('uncertainty, sensitivity and VOI run before a recommendation is permitted', () => {
  const candidates = [
    { id: 'a', name: 'Option A', evidenceState: 'evidence-complete', evidence: {} },
    { id: 'b', name: 'Option B', evidenceState: 'evidence-complete', evidence: {} }
  ];
  const blocked = runUncertaintySensitivityVOI({ candidates });
  assert.equal(blocked.status, 'incomplete');
  assert.equal(blocked.voi.status, 'not-computable');
  const analysis = runUncertaintySensitivityVOI({
    candidates,
    analysisInputs: {
      a: { estimate: 10, uncertainty: { low: 8, high: 12 }, voi: 0 },
      b: { estimate: 9, uncertainty: { low: 7, high: 9 }, voi: 0 }
    }
  });
  assert.equal(analysis.status, 'complete');
  assert.equal(analysis.baselineWinner, 'a');
  assert.equal(analysis.recommendationFlip, false);
  assert.equal(analysis.voi.status, 'complete');
});

test('a sensitivity flip blocks recommendation instead of hiding instability', () => {
  const run = buildDiscoveryRun({
    problem: 'reduce violent crime',
    requiredSourceTypes: SOURCE_TYPES,
    acquisitionSources: SOURCE_TYPES.map(type => ({ sourceId: type, sourceType: type, status: 'searched', candidatesReturned: 1 })),
    localCandidates: [{ id: 'a', name: 'Violence interruption', problemTags: ['violent-crime'], requiredEvidence: ['causal'] }, { id: 'b', name: 'Focused violence response', problemTags: ['violent-crime'], requiredEvidence: ['causal'] }],
    evidenceIndex: { a: { causal: { status: 'verified' } }, b: { causal: { status: 'verified' } } },
    analysisInputs: { a: { estimate: 10, uncertainty: { low: 5, high: 12 }, voi: 0 }, b: { estimate: 9, uncertainty: { low: 8, high: 11 }, voi: 0 } }
  });
  assert.equal(run.analysis.recommendationFlip, true);
  assert.equal(run.governance.recommendationAllowed, false);
  assert.equal(run.decision.recommendation, null);
});

test('stable evidence-complete analysis can permit a recommendation', () => {
  const run = buildDiscoveryRun({
    problem: 'reduce violent crime',
    acquisitionSources: SOURCE_TYPES.map(type => ({ sourceId: type, sourceType: type, status: 'searched', candidatesReturned: 1 })),
    localCandidates: [{ id: 'a', name: 'Violence interruption', problemTags: ['violent-crime'], requiredEvidence: ['causal'] }, { id: 'b', name: 'Focused violence response', problemTags: ['violent-crime'], requiredEvidence: ['causal'] }],
    evidenceIndex: { a: { causal: { status: 'verified' } }, b: { causal: { status: 'verified' } } },
    analysisInputs: { a: { estimate: 10, uncertainty: { low: 9, high: 11 }, voi: 0 }, b: { estimate: 6, uncertainty: { low: 5, high: 7 }, voi: 0 } }
  });
  assert.equal(run.analysis.status, 'complete');
  assert.equal(run.analysis.recommendationFlip, false);
  assert.equal(run.analysis.voi.status, 'complete');
  assert.equal(run.governance.recommendationAllowed, true);
  assert.equal(run.decision.recommendation, 'a');
});

test('full decision artifact preserves discovery, evidence, counterfactual and learning state', () => {
  const run = buildDiscoveryRun({
    problem: 'reduce violent crime',
    acquisitionSources: SOURCE_TYPES.map(type => ({ sourceId: type, sourceType: type, status: 'searched', candidatesReturned: 1 })),
    localCandidates: [{ id: 'a', name: 'Violence interruption', problemTags: ['violent-crime'], requiredEvidence: ['causal'] }],
    evidenceIndex: { a: { causal: { status: 'verified' } } },
    analysisInputs: { a: { estimate: 10, uncertainty: { low: 9, high: 11 }, voi: 0 } },
    statusQuo: { description: 'continue current allocation', preserved: true }
  });
  const artifact = buildDecisionArtifact(run);
  assert.equal(ArtifactStore.verifyArtifact(artifact).ok, true);
  assert.equal(artifact.audit.candidateUniverseHash, run.discoveryAudit.candidateUniverseHash);
  assert.equal(artifact.counterfactual.statusQuo.preserved, true);
  assert.equal(artifact.learning.historyRewrite, false);
  assert.equal(artifact.learning.automaticParameterMutation, false);
});

test('artifact persistence uses the existing race-safe immutable chain', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vidik-discovery-artifact-'));
  const file = path.join(dir, 'decisions.json');
  const run = buildDiscoveryRun({ problem: 'improve public library wait times' });
  const record = persistDecisionArtifact(file, run);
  assert.equal(record.sequence, 0);
  const records = ArtifactStore.readStore(file);
  assert.equal(records.length, 1);
  assert.equal(ArtifactStore.verifyChain(records).ok, true);
});

test('learning state cannot rewrite the historical baseline', () => {
  const run = buildDiscoveryRun({ problem: 'improve public library wait times' });
  const firstBaseline = run.learning.baselineHash;
  const changedOutcome = { ...run.learning, observedOutcome: { effect: 0 }, proposedRecalibration: { effect: 0.1 } };
  assert.equal(run.learning.historyRewrite, false);
  assert.equal(run.learning.automaticParameterMutation, false);
  assert.equal(firstBaseline, run.learning.baselineHash);
  assert.equal(changedOutcome.historyRewrite, false);
});
