'use strict';
const crypto = require('node:crypto');
const Discovery = require('./intervention-discovery');
const Orchestrator = require('./decision-discovery-orchestrator');
const TransferIntelligence = require('./discovery-transfer-intelligence');
const NextPhase = require('./vidik-next-phase');
const SourceDriven = require('./source-driven-intervention-discovery');
const EvidenceDriven = require('./source-driven-evidence-discovery');
const Governance = require('./vidik-arbitrary-decision-governance');
const Closure = require('./vidik-decision-artifact-closure');
const FAILED = new Set(['failed', 'search-failed', 'error', 'blocked']);

function canonicalFailureStatus(status) { return FAILED.has(status) ? 'search-failed' : status; }
function failureEvidence(candidate) { return Object.fromEntries((candidate.requiredEvidence || []).map(type => [type, { status: 'blocked', reason: 'evidence-search-failed' }])); }
function normalizeDiscoveryJurisdiction(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const aliases = { canada: 'CA', australia: 'AU', 'united states': 'US', 'united states of america': 'US', 'united kingdom': 'UK', ca: 'CA', au: 'AU', us: 'US', uk: 'UK', international: 'international' };
  if (aliases[lower]) return aliases[lower];
  const country = lower.split(',').at(-1).trim();
  return aliases[country] || raw;
}
async function searchSource(sourceType, problem, searcher) {
  if (typeof searcher !== 'function') return { sourceId: null, sourceType, status: 'not-searched', candidatesReturned: 0, query: problem, candidates: [] };
  try {
    const result = await searcher({ problem, problemSignals: Discovery.normalizeProblemTags(problem), sourceType });
    const candidates = Array.isArray(result?.candidates) ? result.candidates : [];
    const rawStatus = result?.status;
    return {
      sourceId: result?.sourceId || sourceType,
      sourceType,
      jurisdiction: result?.jurisdiction || null,
      query: result?.query || problem,
      status: FAILED.has(rawStatus) ? 'search-failed' : (candidates.length ? 'candidates-found' : 'searched-empty'),
      candidatesReturned: candidates.length,
      candidates,
      provenance: result?.provenance || null,
      retrievedAt: result?.retrievedAt || null,
      contentHash: result?.contentHash || null,
      freshness: result?.freshness || null,
      validation: result?.validation || null,
      discoveryAssessment: result?.discoveryAssessment || null,
      failureReason: result?.failureReason || (FAILED.has(rawStatus) ? 'source-search-failed' : null)
    };
  } catch (error) {
    return { sourceId: sourceType, sourceType, jurisdiction: null, query: problem, status: 'search-failed', candidatesReturned: 0, candidates: [], provenance: null, retrievedAt: null, contentHash: null, freshness: null, validation: null, failureReason: error?.message || 'source-search-failed' };
  }
}

async function executeDecisionDiscovery({ problem, searchers = {}, evidenceSearcher = null, comparableCities = [], requiredSourceTypes = Orchestrator.SOURCE_TYPES, analysisInputs = {}, statusQuo = null, decisionContext = {}, intelligenceContext = {}, autoDiscoverInterventionSources = false, autoDiscoverEvidence = false, fetchImpl = globalThis.fetch, discoveryJurisdiction = null, semanticExpansion = {} } = {}) {
  if (!problem || typeof problem !== 'string' || !problem.trim()) throw new Error('decision-discovery-problem-required');
  const effectiveSearchers = { ...searchers };
  const effectiveDiscoveryJurisdiction = normalizeDiscoveryJurisdiction(discoveryJurisdiction || decisionContext.jurisdiction);
  if (autoDiscoverInterventionSources && typeof effectiveSearchers['intervention-library'] !== 'function') {
    effectiveSearchers['intervention-library'] = async ({ problem: requestedProblem }) => {
      const discovered = await SourceDriven.discoverSourceDrivenInterventions({ problem: requestedProblem, jurisdiction: effectiveDiscoveryJurisdiction, fetchImpl });
      return {
        sourceId: 'source-driven-intervention-discovery',
        sourceType: 'intervention-library',
        discoveryAssessment: discovered.interventionUniverse,
        jurisdiction: effectiveDiscoveryJurisdiction,
        status: discovered.sourceSearches.some(search => search.status === 'search-failed') ? 'search-failed' : undefined,
        candidates: discovered.candidates,
        provenance: discovered.sourceSearches,
        query: requestedProblem,
        failureReason: discovered.sourceSearches.find(search => search.status === 'search-failed')?.failureReason || null,
        applicability: discovered.sourceApplicability
      };
    };
  }
  const sourceSearches = await Promise.all(requiredSourceTypes.filter(type => type !== 'comparable-city').map(type => searchSource(type, problem, effectiveSearchers[type])));
  const candidates = [];
  for (const search of sourceSearches) {
    for (const candidate of search.candidates) {
      const normalized = Orchestrator.normalizeLead(candidate, { sourceId: search.sourceId || search.sourceType, sourceType: search.sourceType, jurisdiction: search.jurisdiction });
      if (normalized) candidates.push(normalized);
    }
  }
  const build = (evidenceIndex, inputs) => Orchestrator.buildDiscoveryRun({ problem, acquisitionSources: sourceSearches, localCandidates: candidates.filter(c => c.discovery.sourceType === 'local-program'), acquiredCandidates: candidates.filter(c => c.discovery.sourceType === 'intervention-library'), researchLeads: candidates.filter(c => c.discovery.sourceType === 'research'), comparableCities, evidenceIndex, analysisInputs: inputs, requiredSourceTypes, statusQuo, decisionContext });
  const initial = build({}, {});
  const evidenceIndex = {}, evidenceSearches = [], evidenceDiscovery = [];
  for (const candidate of initial.candidates) {
    let searchFn = evidenceSearcher;
    let discoveryOnly = false;
    if (typeof searchFn !== 'function' && autoDiscoverEvidence) {
      searchFn = async ({ problem: requestedProblem, candidate: requestedCandidate }) => EvidenceDriven.discoverCandidateEvidence({ problem: requestedProblem, candidate: requestedCandidate, fetchImpl });
      discoveryOnly = true;
    }
    if (typeof searchFn !== 'function') {
      evidenceSearches.push({ candidateId: candidate.id, status: 'not-searched', sourceIds: [], failureReason: null });
      continue;
    }
    try {
      const result = await searchFn({ problem, problemSignals: initial.problemSignals, candidate });
      const status = canonicalFailureStatus(result?.status || (result?.evidenceComplete === false ? 'evidence-leads-found' : 'searched'));
      if (FAILED.has(result?.status)) evidenceIndex[candidate.id] = failureEvidence(candidate);
      else evidenceIndex[candidate.id] = result?.evidence || (discoveryOnly ? {} : result) || {};
      evidenceSearches.push({ candidateId: candidate.id, status, sourceIds: result?.sourceIds || result?.sourceSearches?.map(item => item.sourceId).filter(Boolean) || [], failureReason: result?.failureReason || (status === 'search-failed' ? 'evidence-search-failed' : null) });
      if (discoveryOnly) evidenceDiscovery.push({ candidateId: candidate.id, ...result });
    } catch (error) {
      evidenceIndex[candidate.id] = failureEvidence(candidate);
      evidenceSearches.push({ candidateId: candidate.id, status: 'search-failed', sourceIds: [], failureReason: error?.message || 'evidence-search-failed' });
    }
  }
  const run = build(evidenceIndex, analysisInputs);
  run.evidenceSearches = evidenceSearches;
  run.evidenceDiscovery = evidenceDiscovery;
  run.governance.evidenceSearchComplete = evidenceSearches.length === initial.candidates.length && evidenceSearches.every(s => !FAILED.has(s.status) && s.status !== 'not-searched');
  run.governance.evidenceDiscoveryOnly = autoDiscoverEvidence && typeof evidenceSearcher !== 'function';
  run.governance.recommendationAllowed = Boolean(run.governance.recommendationAllowed && run.governance.evidenceSearchComplete && !run.governance.evidenceDiscoveryOnly);
  const intelligence = TransferIntelligence.buildDecisionIntelligence({ problem, context: { ...decisionContext, ...intelligenceContext }, sourceResults: sourceSearches, comparableCities, candidates: run.candidates, evidenceIndex, analysis: Object.fromEntries(run.candidates.map(c => [c.id, analysisInputs[c.id] || {}])), statusQuo });
  run.intelligence = intelligence;
  const nextPhaseGraph = NextPhase.buildDecisionKnowledgeGraph({ problem, candidates: run.candidates, evidenceIndex, context: { ...decisionContext, ...intelligenceContext }, statusQuo });
  const nextPhaseWhyWhyNot = NextPhase.buildWhyWhyNot({ ranked: intelligence.ranking || [], evidenceIndex, analysis: Object.fromEntries(run.candidates.map(c => [c.id, analysisInputs[c.id] || {}])), statusQuo, robustness: intelligence.robustness || null });
  const sourceNetwork = NextPhase.buildExternalSourceNetwork(problem, { ...decisionContext, ...intelligenceContext });
  run.nextPhase = { sourceNetwork, knowledgeGraph: nextPhaseGraph, whyWhyNot: nextPhaseWhyWhyNot, blindBenchmarkSize: NextPhase.buildBlindBenchmark().length, learningPolicy: NextPhase.outcomeLearningReview([], run.runHash || null) };
  run.governance.discoveryStrategyHash = intelligence.strategy.strategyHash;
  run.governance.transferEffectsImported = intelligence.governance.comparableEffectsImported;
  run.governance.learningEnvelope = intelligence.governance.learning;
  run.governance.whyNotAvailable = true;
  run.governance.knowledgeGraphPresent = true;
  run.governance.externalSourceNetworkPresent = sourceNetwork.sourceCount > 0;
  const universeIntelligence = Governance.buildCandidateUniverseIntelligence({ candidates: run.candidates, sourceSearches, statusQuo });
  const learningDiscovery = Governance.buildLearningDiscoveryLeads({ problem, learning: intelligence.governance.learning || {}, comparableCities });
  run.governance.candidateUniverseIntelligence = universeIntelligence;
  run.learningDiscovery = learningDiscovery;
  run.governance.learningDiscoveryLeadOnly = true;
  run.governance.learningEffectsImported = false;
  run.governance.arbitraryDecisionGovernanceVersion = 'v1';
  run.governance.semanticExpansion = Governance.buildSemanticExpansion({ problem, ...semanticExpansion });
  run.governance.evidenceToDecisionGates = Object.fromEntries(run.candidates.map(candidate => [candidate.id, Governance.buildEvidenceToDecisionGate({ candidate, evidence: evidenceIndex[candidate.id] || {}, parameter: analysisInputs[candidate.id]?.parameter || null, marginal: analysisInputs[candidate.id]?.marginal || null, uncertainty: analysisInputs[candidate.id]?.uncertainty || null, voi: analysisInputs[candidate.id]?.voi || null, optimization: analysisInputs[candidate.id]?.optimization || null, statusQuo })]));
  const preArtifactHash = crypto.createHash('sha256').update(JSON.stringify(run)).digest('hex');
  if (!run.governance.recommendationAllowed) {
    run.governance.decisionStatus = 'recommendation-blocked';
    run.decision.status = 'recommendation-blocked';
    run.decision.recommendation = null;
    run.decision.recommendationAllowed = false;
  }
  const gates = run.governance.evidenceToDecisionGates;
  const selected = run.decision.recommendation;
  const artifacts = {};
  for (const candidate of run.candidates) {
    const gate = gates[candidate.id];
    const analysis = analysisInputs[candidate.id] || {};
    const selectedHere = Boolean(run.decision.recommendationAllowed && (selected === candidate.id || selected === candidate.name || selected === candidate.interventionId));
    const candidateGate = { ...gate, recommendationEligible: Boolean(gate.recommendationEligible && selectedHere) };
    const counterfactual = Closure.buildCounterfactual({ statusQuo, candidate, analysis, gate: candidateGate });
    const artifact = Closure.buildDecisionArtifact({ problem, run: { ...run, runHash: preArtifactHash }, candidate, gate: candidateGate, analysis, statusQuo, whyWhyNot: nextPhaseWhyWhyNot, counterfactual, evidence: evidenceIndex[candidate.id] || {} });
    artifacts[candidate.id] = { ...artifact, validation: Closure.validateDecisionArtifact(artifact) };
  }
  run.governance.decisionArtifacts = artifacts;
  run.governance.decisionArtifactSchema = 'vidik.decision-artifact.v1';
  run.governance.counterfactualRequired = true;
  const selectedArtifact = Object.values(artifacts).find(a => a.recommendationAllowed) || null;
  run.governance.selectedDecisionArtifactHash = selectedArtifact?.artifactHash || null;
  run.governance.outcomeClosure = Governance.buildOutcomeClosure({ decisionArtifactHash: selectedArtifact?.artifactHash || preArtifactHash, observations: decisionContext.outcomeObservations || [] });
  run.governance.reviewPlan = Closure.buildReviewPlan({ artifactHash: selectedArtifact?.artifactHash || preArtifactHash });
  const gateValues = Object.values(gates);
  const lifecycle = Governance.buildDecisionLifecycle({ problem, discovery: true, evidenceVerification: gateValues.length > 0 && gateValues.every(g => g.gates.A_evidenceQuality), universe: universeIntelligence, learningDiscovery, downstream: { parameters: gateValues.length > 0 && gateValues.every(g => g.gates.B_candidateParameter), marginal: gateValues.length > 0 && gateValues.every(g => g.gates.C_marginalResourceEffect), uncertainty: gateValues.length > 0 && gateValues.every(g => g.gates.D_uncertaintyVOIOptimization), voi: gateValues.length > 0 && gateValues.every(g => g.gates.D_uncertaintyVOIOptimization), optimization: gateValues.length > 0 && gateValues.every(g => g.gates.D_uncertaintyVOIOptimization), whyWhyNot: Boolean(nextPhaseWhyWhyNot), transferability: Boolean(intelligence.governance), decision: Boolean(selectedArtifact), override: Boolean(run.governance.governanceOverridesAudit?.audit), audit: Boolean(selectedArtifact), outcomeReview: Boolean(run.governance.outcomeClosure), learning: Boolean(learningDiscovery) } });
  run.governance.decisionLifecycle = lifecycle;
  run.runHash = crypto.createHash('sha256').update(JSON.stringify(run)).digest('hex');
  return run;
}

async function executeFullCapacityDecision(options = {}) {
  return executeDecisionDiscovery({
    ...options,
    autoDiscoverInterventionSources: true,
    autoDiscoverEvidence: true,
    discoveryJurisdiction: normalizeDiscoveryJurisdiction(options.discoveryJurisdiction || options.decisionContext?.jurisdiction)
  });
}

module.exports = { searchSource, normalizeDiscoveryJurisdiction, executeDecisionDiscovery, executeFullCapacityDecision };
