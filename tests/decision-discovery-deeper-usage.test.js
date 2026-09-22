'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  SOURCE_TYPES,
  normalizeLead,
  normalizeSourceSearch,
  deduplicateCandidates,
  buildSearchManifest,
  runUncertaintySensitivityVOI,
  buildDiscoveryRun,
  buildDecisionArtifact
} = require('../js/decision-discovery-orchestrator');
const { hashCandidateUniverse } = require('../js/intervention-discovery');

const candidate = (id, name, tags = ['violent-crime'], requiredEvidence = ['causal']) => ({ id, name, problemTags: tags, requiredEvidence });
const complete = (item) => Object.fromEntries(item.requiredEvidence.map(type => [type, { status: 'verified' }]));

function healthyRun(overrides = {}) {
  const item = overrides.item || candidate('a', 'Option A');
  return buildDiscoveryRun({
    problem: overrides.problem || 'reduce violent crime',
    localCandidates: [item],
    evidenceIndex: { [item.id]: complete(item) },
    analysisInputs: { [item.id]: { estimate: 10, uncertainty: { low: 9, high: 11 }, voi: 1 } },
    acquisitionSources: SOURCE_TYPES.filter(type => type !== 'comparable-city').map(type => ({ sourceId: `${type}-source`, sourceType: type, status: 'candidates-found', candidatesReturned: 1 })),
    requiredSourceTypes: SOURCE_TYPES.filter(type => type !== 'comparable-city'),
    statusQuo: overrides.statusQuo,
    comparableCities: overrides.comparableCities || []
  });
}

test('candidate-universe hashing is invariant to candidate ordering', () => {
  const a = [candidate('a', 'A'), candidate('b', 'B')];
  const b = [candidate('b', 'B'), candidate('a', 'A')];
  assert.equal(hashCandidateUniverse(a), hashCandidateUniverse(b));
});

test('candidate provenance is canonicalized from the trusted discovery source', () => {
  const lead = normalizeLead({
    id: 'x',
    name: 'Option X',
    problemTags: ['violent-crime'],
    discovery: {
      provenance: [{ sourceId: 'spoofed-source', sourceType: 'official-data', jurisdiction: 'Fake City' }]
    }
  }, { sourceId: 'trusted-research', sourceType: 'research', jurisdiction: 'Real City' });
  assert.equal(lead.discovery.provenance.length, 1);
  assert.equal(lead.discovery.provenance[0].sourceId, 'trusted-research');
  assert.equal(lead.discovery.provenance[0].sourceType, 'research');
  assert.equal(lead.discovery.provenance[0].jurisdiction, 'Real City');
});

test('deduplication cannot allow a spoofed provenance record to survive', () => {
  const trusted = normalizeLead(candidate('a', 'Option A'), { sourceId: 'trusted', sourceType: 'research', jurisdiction: 'Real City' });
  const spoofed = { ...trusted, discovery: { ...trusted.discovery, provenance: [{ sourceId: 'spoofed', sourceType: 'official-data', jurisdiction: 'Fake City' }] } };
  const merged = deduplicateCandidates([trusted, spoofed]);
  assert.equal(merged.length, 1);
  assert.ok(merged[0].discovery.provenance.every(item => item.sourceId !== 'spoofed'));
});

test('search manifest distinguishes not-searched, searched-empty, candidates-found and failed', () => {
  const manifest = buildSearchManifest({
    problem: 'reduce violent crime',
    acquisitionSources: [
      { sourceId: 'local', sourceType: 'local-program', status: 'candidates-found', candidatesReturned: 2 },
      { sourceId: 'research', sourceType: 'research', status: 'searched-empty', candidatesReturned: 0 },
      { sourceId: 'official', sourceType: 'official-data', status: 'failed', candidatesReturned: 0, failureReason: 'timeout' }
    ],
    requiredSourceTypes: SOURCE_TYPES
  });
  assert.equal(manifest.find(x => x.sourceType === 'local-program').status, 'candidates-found');
  assert.equal(manifest.find(x => x.sourceType === 'research').status, 'searched-empty');
  assert.equal(manifest.find(x => x.sourceType === 'official-data').status, 'failed');
  assert.equal(manifest.find(x => x.sourceType === 'intervention-library').status, 'not-searched');
  assert.equal(manifest.find(x => x.sourceType === 'comparable-city').status, 'not-searched');
});

test('source search normalization rejects impossible negative candidate counts', () => {
  const normalized = normalizeSourceSearch({ sourceId: 'x', sourceType: 'research', status: 'searched', candidatesReturned: -4 });
  assert.equal(normalized.candidatesReturned, 0);
});

test('malformed uncertainty cannot pass as a stable analysis', () => {
  const item = candidate('a', 'A');
  const evidenceComplete = { ...item, evidenceState: 'evidence-complete' };
  const result = runUncertaintySensitivityVOI({ candidates: [evidenceComplete], analysisInputs: { a: { estimate: 10, uncertainty: { low: 11, high: 9 }, voi: 1 } } });
  assert.equal(result.status, 'incomplete');
  assert.equal(result.voi.status, 'not-computable');
});

test('non-finite estimates cannot produce a recommendation winner', () => {
  const item = { ...candidate('a', 'A'), evidenceState: 'evidence-complete' };
  const result = runUncertaintySensitivityVOI({ candidates: [item], analysisInputs: { a: { estimate: 'not-a-number', uncertainty: { low: 1, high: 2 }, voi: 1 } } });
  assert.equal(result.status, 'incomplete');
  assert.equal(result.recommendationFlip, null);
});

test('negative VOI is not silently treated as useful information', () => {
  const item = { ...candidate('a', 'A'), evidenceState: 'evidence-complete' };
  const result = runUncertaintySensitivityVOI({ candidates: [item], analysisInputs: { a: { estimate: 10, uncertainty: { low: 9, high: 11 }, voi: -5 } } });
  assert.notEqual(result.voi.status, 'complete');
});

test('scenario sensitivity is part of the recommendation-flip gate', () => {
  const candidates = [
    { ...candidate('a', 'A'), evidenceState: 'evidence-complete' },
    { ...candidate('b', 'B'), evidenceState: 'evidence-complete' }
  ];
  const result = runUncertaintySensitivityVOI({
    candidates,
    analysisInputs: {
      a: { estimate: 10, uncertainty: { low: 9, high: 11 }, scenarios: [{ value: 3 }], voi: 1 },
      b: { estimate: 8, uncertainty: { low: 7, high: 9 }, scenarios: [{ value: 12 }], voi: 1 }
    }
  });
  assert.equal(result.recommendationFlip, true);
  assert.equal(result.sensitivity.scenarioWinners[0].winner, 'b');
});

test('comparable-city intervention names are not treated as locally evidenced effects', () => {
  const run = healthyRun({
    item: undefined,
    comparableCities: [{ city: 'Toronto', problem: 'violent crime', interventions: ['focused deterrence'], provenance: { sourceId: 'toronto' } }]
  });
  const lead = run.candidates.find(item => item.discovery?.comparableCity === 'Toronto');
  assert.ok(lead);
  assert.equal(lead.discovery.leadOnly, true);
  assert.equal(lead.discovery.effectsImported, false);
  assert.equal(run.governance.effectsImportedFromComparableCities, false);
});

test('status quo must be explicit before a recommendation is allowed', () => {
  const run = healthyRun();
  assert.equal(run.decision.recommendation, null);
  assert.equal(run.governance.recommendationAllowed, false);
});

test('explicit status quo can satisfy the status-quo gate without becoming an option', () => {
  const run = healthyRun({ statusQuo: { id: 'status-quo', description: 'continue current service', explicit: true } });
  assert.equal(run.governance.recommendationAllowed, true);
  assert.equal(run.counterfactual.statusQuo.explicit, true);
  assert.equal(run.counterfactual.alternatives.includes('status-quo'), false);
  assert.ok(run.decision.recommendation);
});

test('decision artifact preserves candidate universe hash and run provenance', () => {
  const run = healthyRun({ statusQuo: { id: 'status-quo', description: 'continue current service', explicit: true } });
  const artifact = buildDecisionArtifact(run, { decisionId: 'USAGE-001' });
  assert.equal(artifact.decisionId, 'USAGE-001');
  assert.equal(artifact.provenance.runHash, run.runHash);
  assert.equal(artifact.provenance.candidateUniverseHash, run.discoveryAudit.candidateUniverseHash);
});

test('empty problem is rejected instead of becoming an implicit broad search', () => {
  assert.throws(() => buildDiscoveryRun({ problem: '   ' }), /problem-required/);
});

test('unknown is never encoded as zero-effect evidence', () => {
  const run = buildDiscoveryRun({
    problem: 'reduce violent crime',
    localCandidates: [candidate('a', 'A', ['violent-crime'], ['causal'])],
    evidenceIndex: {},
    requiredSourceTypes: []
  });
  assert.equal(run.candidates[0].evidenceState, 'evidence-gap');
  assert.equal(run.governance.unknownIsNotZero, true);
  assert.notEqual(run.candidates[0].evidence?.causal?.effect, 0);
});

test('all provenance sources survive semantic candidate deduplication', () => {
  const a = normalizeLead(candidate('a1', 'Same Program'), { sourceId: 'local', sourceType: 'local-program', jurisdiction: 'A' });
  const b = normalizeLead(candidate('b2', 'Same Program'), { sourceId: 'research', sourceType: 'research', jurisdiction: 'B' });
  const merged = deduplicateCandidates([a, b]);
  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].discovery.provenance.map(x => x.sourceId).sort(), ['local', 'research']);
});

test('a blocked source remains blocked when another source finds the same candidate', () => {
  const run = buildDiscoveryRun({
    problem: 'reduce violent crime',
    localCandidates: [candidate('a', 'A')],
    acquisitionSources: [
      { sourceId: 'local', sourceType: 'local-program', status: 'candidates-found', candidatesReturned: 1 },
      { sourceId: 'research', sourceType: 'research', status: 'search-failed', candidatesReturned: 0, failureReason: 'timeout' }
    ],
    evidenceIndex: { a: complete(candidate('a', 'A')) },
    analysisInputs: { a: { estimate: 10, uncertainty: { low: 9, high: 11 }, voi: 1 } },
    requiredSourceTypes: ['local-program', 'research']
  });
  assert.equal(run.discoveryAudit.discoverySearchComplete, false);
  assert.equal(run.decision.recommendation, null);
});

test('run hash changes when candidate universe changes', () => {
  const one = healthyRun({ statusQuo: { id: 'status-quo', explicit: true } });
  const two = healthyRun({ statusQuo: { id: 'status-quo', explicit: true }, item: candidate('b', 'Different Option') });
  assert.notEqual(one.runHash, two.runHash);
});

test('provenance contains source type and jurisdiction for every discovered candidate', () => {
  const run = healthyRun({ statusQuo: { id: 'status-quo', explicit: true } });
  for (const item of run.candidates) {
    for (const provenance of item.discovery.provenance) {
      assert.ok(provenance.sourceType);
      assert.ok(provenance.jurisdiction !== undefined);
    }
  }
});
