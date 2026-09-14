'use strict';

const crypto = require('node:crypto');
const Discovery = require('./intervention-discovery');
const Orchestrator = require('./decision-discovery-orchestrator');
const TransferIntelligence = require('./discovery-transfer-intelligence');
const NextPhase = require('./vidik-next-phase');
const SourceDriven = require('./source-driven-intervention-discovery');

const FAILED = new Set(['failed', 'search-failed', 'error', 'blocked']);

function canonicalFailureStatus(status) { return FAILED.has(status) ? 'search-failed' : status; }
function failureEvidence(candidate) { return Object.fromEntries((candidate.requiredEvidence || []).map(type => [type, { status: 'blocked', reason: 'evidence-search-failed' }])); }

async function searchSource(sourceType, problem, searcher) {
  if (typeof searcher !== 'function') return { sourceId: null, sourceType, status: 'not-searched', candidatesReturned: 0, query: problem, candidates: [] };
  try {
    const result = await searcher({ problem, problemSignals: Discovery.normalizeProblemTags(problem), sourceType });
    const candidates = Array.isArray(result?.candidates) ? result.candidates : [];
    const rawStatus = result?.status;
    return {
      sourceId: result?.sourceId || sourceType, sourceType, jurisdiction: result?.jurisdiction || null,
      query: result?.query || problem, status: FAILED.has(rawStatus) ? 'search-failed' : (candidates.length ? 'candidates-found' : 'searched-empty'),
      candidatesReturned: candidates.length, candidates, provenance: result?.provenance || null,
      retrievedAt: result?.retrievedAt || null, contentHash: result?.contentHash || null,
      freshness: result?.freshness || null, validation: result?.validation || null,
      failureReason: result?.failureReason || (FAILED.has(rawStatus) ? 'source-search-failed' : null)
    };
  } catch (error) {
    return { sourceId: sourceType, sourceType, jurisdiction: null, query: problem, status: 'search-failed', candidatesReturned: 0, candidates: [], provenance: null, retrievedAt: null, contentHash: null, freshness: null, validation: null, failureReason: error?.message || 'source-search-failed' };
  }
}

async function executeDecisionDiscovery({
  problem, searchers = {}, evidenceSearcher = null, comparableCities = [], requiredSourceTypes = Orchestrator.SOURCE_TYPES,
  analysisInputs = {}, statusQuo = null, decisionContext = {}, intelligenceContext = {},
  autoDiscoverInterventionSources = false, fetchImpl = globalThis.fetch, discoveryJurisdiction = null
} = {}) {
  if (!problem || typeof problem !== 'string' || !problem.trim()) throw new Error('decision-discovery-problem-required');

  const effectiveSearchers = { ...searchers };
  if (autoDiscoverInterventionSources && typeof effectiveSearchers['intervention-library'] !== 'function') {
    effectiveSearchers['intervention-library'] = async ({ problem: requestedProblem }) => {
      const discovered = await SourceDriven.discoverSourceDrivenInterventions({ problem: requestedProblem, jurisdiction: discoveryJurisdiction, fetchImpl });
      return {
        sourceId: 'source-driven-intervention-discovery', sourceType: 'intervention-library', status: discovered.sourceSearches.some(search => search.status === 'search-failed') ? 'search-failed' : undefined,
        candidates: discovered.candidates, provenance: discovered.sourceSearches, query: requestedProblem,
        failureReason: discovered.sourceSearches.find(search => search.status === 'search-failed')?.failureReason || null
      };
    };
  }

  const sourceSearches = await Promise.all(requiredSourceTypes.filter(type => type !== 'comparable-city').map(type => searchSource(type, problem, effectiveSearchers[type])));
  const candidates = [];
  for (const search of sourceSearches) for (const candidate of search.candidates) {
    const normalized = Orchestrator.normalizeLead(candidate, { sourceId: search.sourceId || search.sourceType, sourceType: search.sourceType, jurisdiction: search.jurisdiction });
    if (normalized) candidates.push(normalized);
  }

  const build = (evidenceIndex, inputs) => Orchestrator.buildDiscoveryRun({
    problem, acquisitionSources: sourceSearches,
    localCandidates: candidates.filter(candidate => candidate.discovery.sourceType === 'local-program'),
    acquiredCandidates: candidates.filter(candidate => candidate.discovery.sourceType === 'intervention-library'),
    researchLeads: candidates.filter(candidate => candidate.discovery.sourceType === 'research'), comparableCities,
    evidenceIndex, analysisInputs: inputs, requiredSourceTypes, statusQuo, decisionContext
  });

  const initial = build({}, {});
  const evidenceIndex = {};
  const evidenceSearches = [];
  for (const candidate of initial.candidates) {
    if (typeof evidenceSearcher !== 'function') { evidenceSearches.push({ candidateId: candidate.id, status: 'not-searched', sourceIds: [], failureReason: null }); continue; }
    try {
      const result = await evidenceSearcher({ problem, problemSignals: initial.problemSignals, candidate });
      const status = canonicalFailureStatus(result?.status || 'searched');
      if (FAILED.has(result?.status)) evidenceIndex[candidate.id] = failureEvidence(candidate); else evidenceIndex[candidate.id] = result?.evidence || result || {};
      evidenceSearches.push({ candidateId: candidate.id, status, sourceIds: result?.sourceIds || [], failureReason: result?.failureReason || (status === 'search-failed' ? 'evidence-search-failed' : null) });
    } catch (error) {
      evidenceIndex[candidate.id] = failureEvidence(candidate);
      evidenceSearches.push({ candidateId: candidate.id, status: 'search-failed', sourceIds: [], failureReason: error?.message || 'evidence-search-failed' });
    }
  }

  const run = build(evidenceIndex, analysisInputs);
  run.evidenceSearches = evidenceSearches;
  run.governance.evidenceSearchComplete = evidenceSearches.every(search => search.status !== 'search-failed');
  run.governance.recommendationAllowed = Boolean(run.governance.recommendationAllowed && run.governance.evidenceSearchComplete);

  const intelligence = TransferIntelligence.buildDecisionIntelligence({ problem, context: { ...decisionContext, ...intelligenceContext }, sourceResults: sourceSearches, comparableCities, candidates: run.candidates, evidenceIndex, analysis: Object.fromEntries(run.candidates.map(candidate => [candidate.id, analysisInputs[candidate.id] || {}])), statusQuo });
  run.intelligence = intelligence;
  const nextPhaseGraph = NextPhase.buildDecisionKnowledgeGraph({ problem, candidates: run.candidates, evidenceIndex, context: { ...decisionContext, ...intelligenceContext }, statusQuo });
  const nextPhaseWhyWhyNot = NextPhase.buildWhyWhyNot({ ranked: intelligence.ranking || [], evidenceIndex, analysis: Object.fromEntries(run.candidates.map(candidate => [candidate.id, analysisInputs[candidate.id] || {}])), statusQuo, robustness: intelligence.robustness || null });
  const sourceNetwork = NextPhase.buildExternalSourceNetwork(problem, { ...decisionContext, ...intelligenceContext });
  run.nextPhase = { sourceNetwork, knowledgeGraph: nextPhaseGraph, whyWhyNot: nextPhaseWhyWhyNot, blindBenchmarkSize: NextPhase.buildBlindBenchmark().length, learningPolicy: NextPhase.outcomeLearningReview([], run.runHash || null) };
  run.governance.discoveryStrategyHash = intelligence.strategy.strategyHash;
  run.governance.transferEffectsImported = intelligence.governance.comparableEffectsImported;
  run.governance.learningEnvelope = intelligence.governance.learning;
  run.governance.whyNotAvailable = true;
  run.governance.knowledgeGraphPresent = true;
  run.governance.externalSourceNetworkPresent = sourceNetwork.sourceCount > 0;
  if (!run.governance.recommendationAllowed) { run.governance.decisionStatus = 'recommendation-blocked'; run.decision.status = 'recommendation-blocked'; run.decision.recommendation = null; run.decision.recommendationAllowed = false; }
  run.runHash = crypto.createHash('sha256').update(JSON.stringify(run)).digest('hex');
  return run;
}

module.exports = { searchSource, executeDecisionDiscovery };
