'use strict';

const Discovery = require('./intervention-discovery');
const Orchestrator = require('./decision-discovery-orchestrator');

const FAILED = new Set(['failed', 'search-failed', 'error', 'blocked']);

function failureEvidence(candidate) {
  return Object.fromEntries((candidate.requiredEvidence || []).map(type => [type, { status: 'blocked', reason: 'evidence-search-failed' }]));
}

async function searchSource(sourceType, problem, searcher) {
  if (typeof searcher !== 'function') {
    return { sourceId: null, sourceType, status: 'not-searched', candidatesReturned: 0, query: problem, candidates: [] };
  }
  try {
    const result = await searcher({ problem, problemSignals: Discovery.normalizeProblemTags(problem), sourceType });
    const candidates = Array.isArray(result?.candidates) ? result.candidates : [];
    const status = FAILED.has(result?.status) ? result.status : (candidates.length ? 'candidates-found' : 'searched-empty');
    return {
      sourceId: result?.sourceId || sourceType,
      sourceType,
      jurisdiction: result?.jurisdiction || null,
      query: result?.query || problem,
      status,
      candidatesReturned: candidates.length,
      candidates,
      provenance: result?.provenance || null,
      retrievedAt: result?.retrievedAt || null,
      contentHash: result?.contentHash || null,
      freshness: result?.freshness || null,
      validation: result?.validation || null,
      failureReason: result?.failureReason || (FAILED.has(status) ? 'source-search-failed' : null)
    };
  } catch (error) {
    return {
      sourceId: sourceType,
      sourceType,
      jurisdiction: null,
      query: problem,
      status: 'search-failed',
      candidatesReturned: 0,
      candidates: [],
      provenance: null,
      retrievedAt: null,
      contentHash: null,
      freshness: null,
      validation: null,
      failureReason: error?.message || 'source-search-failed'
    };
  }
}

async function executeDecisionDiscovery({
  problem,
  searchers = {},
  evidenceSearcher = null,
  comparableCities = [],
  requiredSourceTypes = Orchestrator.SOURCE_TYPES,
  analysisInputs = {},
  statusQuo = null,
  decisionContext = {}
} = {}) {
  if (!problem || typeof problem !== 'string' || !problem.trim()) throw new Error('decision-discovery-problem-required');

  const sourceSearches = await Promise.all(requiredSourceTypes
    .filter(type => type !== 'comparable-city')
    .map(type => searchSource(type, problem, searchers[type])));

  const candidates = [];
  for (const search of sourceSearches) {
    for (const candidate of search.candidates) {
      const normalized = Orchestrator.normalizeLead(candidate, {
        sourceId: search.sourceId || search.sourceType,
        sourceType: search.sourceType,
        jurisdiction: search.jurisdiction
      });
      if (normalized) candidates.push(normalized);
    }
  }

  const comparable = Orchestrator.comparableCityLeads({ problem, cities: comparableCities });
  const initial = Orchestrator.buildDiscoveryRun({
    problem,
    acquisitionSources: sourceSearches,
    localCandidates: candidates.filter(candidate => candidate.discovery.sourceType === 'local-program'),
    acquiredCandidates: candidates.filter(candidate => candidate.discovery.sourceType === 'intervention-library'),
    researchLeads: candidates.filter(candidate => candidate.discovery.sourceType === 'research'),
    comparableCities: comparable,
    evidenceIndex: {},
    analysisInputs: {},
    requiredSourceTypes,
    statusQuo,
    decisionContext
  });

  const evidenceIndex = {};
  const evidenceSearches = [];
  for (const candidate of initial.candidates) {
    if (typeof evidenceSearcher !== 'function') {
      evidenceSearches.push({ candidateId: candidate.id, status: 'not-searched', sourceIds: [], failureReason: null });
      continue;
    }
    try {
      const result = await evidenceSearcher({ problem, problemSignals: initial.problemSignals, candidate });
      evidenceIndex[candidate.id] = result?.evidence || result || {};
      evidenceSearches.push({ candidateId: candidate.id, status: result?.status || 'searched', sourceIds: result?.sourceIds || [], failureReason: null });
    } catch (error) {
      evidenceIndex[candidate.id] = failureEvidence(candidate);
      evidenceSearches.push({ candidateId: candidate.id, status: 'search-failed', sourceIds: [], failureReason: error?.message || 'evidence-search-failed' });
    }
  }

  const run = Orchestrator.buildDiscoveryRun({
    problem,
    acquisitionSources: sourceSearches,
    localCandidates: candidates.filter(candidate => candidate.discovery.sourceType === 'local-program'),
    acquiredCandidates: candidates.filter(candidate => candidate.discovery.sourceType === 'intervention-library'),
    researchLeads: candidates.filter(candidate => candidate.discovery.sourceType === 'research'),
    comparableCities: comparable,
    evidenceIndex,
    analysisInputs,
    requiredSourceTypes,
    statusQuo,
    decisionContext
  });

  run.evidenceSearches = evidenceSearches;
  run.governance.evidenceSearchComplete = evidenceSearches.every(search => search.status !== 'search-failed');
  run.governance.recommendationAllowed = Boolean(run.governance.recommendationAllowed && run.governance.evidenceSearchComplete);
  if (!run.governance.recommendationAllowed) {
    run.governance.decisionStatus = 'recommendation-blocked';
    run.decision.status = 'recommendation-blocked';
    run.decision.recommendation = null;
    run.decision.recommendationAllowed = false;
  }
  run.runHash = require('node:crypto').createHash('sha256').update(JSON.stringify(run)).digest('hex');
  return run;
}

module.exports = { searchSource, executeDecisionDiscovery };
