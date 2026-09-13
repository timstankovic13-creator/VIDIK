'use strict';

const crypto = require('node:crypto');

const SOURCE_ORDER = Object.freeze([
  'local-program',
  'official-data',
  'research',
  'intervention-library',
  'comparable-city'
]);

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).sort().join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hash(value) {
  return crypto.createHash('sha256').update(stable(value)).digest('hex');
}

function tokens(text = '') {
  return String(text)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function buildSearchStrategy(problem, context = {}) {
  const base = String(problem || '').trim();
  if (!base) throw new Error('discovery-strategy-problem-required');
  const problemTokens = unique(tokens(base));
  const domain = unique(context.domains || []);
  const jurisdiction = context.jurisdiction || null;
  const synonyms = unique(context.synonyms || []);
  const objectives = unique(context.objectives || []);
  const queries = [];
  const add = (purpose, query) => {
    const q = String(query || '').trim();
    if (q && !queries.some(item => item.query === q && item.purpose === purpose)) queries.push({ purpose, query: q });
  };
  add('problem-baseline', base);
  add('intervention-discovery', `${base} interventions solutions programs policies`);
  add('research-evidence', `${base} systematic review causal evidence effectiveness`);
  add('official-programs', `${base} government program policy service intervention`);
  add('comparable-cities', `${base} cities municipalities implemented intervention outcomes`);
  if (synonyms.length) add('synonym-expansion', `${synonyms.join(' ')} interventions solutions`);
  if (domain.length) add('domain-expansion', `${base} ${domain.join(' ')} interventions`);
  if (objectives.length) add('objective-expansion', `${objectives.join(' ')} ${base} interventions`);
  return {
    problem: base,
    problemTokens,
    jurisdiction,
    requiredSourceTypes: [...SOURCE_ORDER],
    queries,
    coverageRequirements: SOURCE_ORDER.map(sourceType => ({
      sourceType,
      required: true,
      reason: sourceType === 'comparable-city' ? 'discover transferability leads without importing effects' : 'avoid a hand-curated candidate universe'
    })),
    generatedAt: context.generatedAt || null,
    strategyHash: hash({ base, problemTokens, domain, jurisdiction, synonyms, objectives, queries })
  };
}

function normalizeCandidate(candidate, source) {
  if (!candidate) return null;
  const id = String(candidate.id || candidate.interventionId || candidate.name || candidate.title || '').trim();
  if (!id) return null;
  const sourceType = source?.sourceType || 'unknown';
  const sourceId = source?.sourceId || sourceType;
  return {
    id,
    name: candidate.name || candidate.title || id,
    problemTags: unique(candidate.problemTags || []),
    domains: unique(candidate.domains || []),
    source: { sourceId, sourceType, jurisdiction: source?.jurisdiction || null },
    provenance: [{ sourceId, sourceType, jurisdiction: source?.jurisdiction || null }],
    leadOnly: sourceType === 'comparable-city',
    effectsImported: false
  };
}

function candidateKey(candidate) {
  return `${tokens(candidate?.name || candidate?.id).join(' ')}::${unique(candidate?.problemTags || []).map(x => tokens(x).join(' ')).sort().join('|')}`;
}

function buildCandidateUniverse(sourceResults = [], comparableCities = []) {
  const normalized = [];
  for (const source of sourceResults) {
    for (const candidate of Array.isArray(source?.candidates) ? source.candidates : []) {
      const item = normalizeCandidate(candidate, source);
      if (item) normalized.push(item);
    }
  }
  for (const city of comparableCities) {
    for (const intervention of Array.isArray(city?.interventions) ? city.interventions : []) {
      const item = normalizeCandidate({
        id: `${city.city || city.jurisdiction || 'city'}-${intervention}`,
        name: intervention,
        problemTags: city.problemTags || city.matchedSignals || []
      }, { sourceId: city.sourceId || 'comparable-city-learning', sourceType: 'comparable-city', jurisdiction: city.jurisdiction || city.city });
      if (item) normalized.push(item);
    }
  }
  const byKey = new Map();
  for (const item of normalized) {
    const key = candidateKey(item);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, item);
      continue;
    }
    existing.problemTags = unique([...existing.problemTags, ...item.problemTags]);
    existing.domains = unique([...existing.domains, ...item.domains]);
    existing.leadOnly = existing.leadOnly || item.leadOnly;
    existing.effectsImported = false;
    existing.provenance = [...existing.provenance, ...item.provenance]
      .filter((record, index, all) => index === all.findIndex(other => stable(other) === stable(record)));
  }
  const candidates = [...byKey.values()].sort((a, b) => candidateKey(a).localeCompare(candidateKey(b)));
  return {
    candidates,
    candidateUniverseHash: hash(candidates),
    countsBySourceType: Object.fromEntries(SOURCE_ORDER.map(type => [type, candidates.filter(candidate => candidate.source.sourceType === type).length])),
    discoveredAt: null
  };
}

function auditSearchCoverage(strategy, sourceResults = []) {
  const byType = new Map();
  for (const result of sourceResults) {
    const type = result?.sourceType;
    if (!type) continue;
    const failed = ['failed', 'search-failed', 'error', 'blocked'].includes(result.status);
    const status = failed ? 'search-failed' : (Array.isArray(result.candidates) && result.candidates.length ? 'candidates-found' : (result.status || 'searched-empty'));
    const current = byType.get(type);
    if (!current || (current.status === 'searched-empty' && status === 'candidates-found')) byType.set(type, {
      sourceType: type,
      sourceIds: unique([result.sourceId]),
      status,
      candidatesReturned: Math.max(0, Number(result.candidatesReturned) || (Array.isArray(result.candidates) ? result.candidates.length : 0)),
      failureReason: failed ? (result.failureReason || 'source-search-failed') : null
    });
    else current.sourceIds = unique([...current.sourceIds, result.sourceId]);
  }
  const sources = (strategy?.requiredSourceTypes || SOURCE_ORDER).map(sourceType => byType.get(sourceType) || {
    sourceType,
    sourceIds: [],
    status: 'not-searched',
    candidatesReturned: 0,
    failureReason: null
  });
  return {
    complete: sources.every(item => item.status !== 'not-searched' && item.status !== 'search-failed'),
    sources,
    failed: sources.filter(item => item.status === 'search-failed').map(item => item.sourceType),
    notSearched: sources.filter(item => item.status === 'not-searched').map(item => item.sourceType)
  };
}

function evidenceGate(candidate, evidence = {}) {
  const required = unique(candidate?.requiredEvidence || ['causal', 'implementation']);
  const states = required.map(type => ({ type, status: evidence?.[type]?.status || 'unknown' }));
  const missing = states.filter(item => !['supported', 'verified', 'complete'].includes(item.status));
  return { complete: missing.length === 0, required, missing, states };
}

function rankCandidates(candidates = [], evidenceIndex = {}, analysis = {}) {
  return candidates.map(candidate => {
    const evidence = evidenceGate(candidate, evidenceIndex[candidate.id]);
    const input = analysis[candidate.id] || {};
    const evidenceScore = Number.isFinite(Number(input.evidenceScore)) ? Number(input.evidenceScore) : 0;
    const feasibility = Number.isFinite(Number(input.feasibility)) ? Number(input.feasibility) : 0;
    const benefit = Number.isFinite(Number(input.benefit)) ? Number(input.benefit) : 0;
    const uncertaintyPenalty = Number.isFinite(Number(input.uncertaintyPenalty)) ? Math.max(0, Number(input.uncertaintyPenalty)) : 0;
    return {
      candidateId: candidate.id,
      name: candidate.name,
      evidenceComplete: evidence.complete,
      evidenceScore,
      feasibility,
      benefit,
      uncertaintyPenalty,
      score: evidence.complete ? evidenceScore + feasibility + benefit - uncertaintyPenalty : null,
      recommendationEligible: evidence.complete && !candidate.leadOnly
    };
  }).sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity) || a.candidateId.localeCompare(b.candidateId));
}

function assessTransferability(lead, targetContext = {}) {
  const dimensions = ['problem', 'population', 'jurisdiction', 'institutionalCapacity', 'implementationEnvironment', 'evidenceBase'];
  const source = lead?.context || lead || {};
  const target = targetContext || {};
  const checks = dimensions.map(dimension => {
    if (source[dimension] == null || target[dimension] == null) return { dimension, status: 'unknown' };
    if (String(source[dimension]).toLowerCase() === String(target[dimension]).toLowerCase()) return { dimension, status: 'matched' };
    return { dimension, status: 'mismatch' };
  });
  const matched = checks.filter(item => item.status === 'matched').length;
  const mismatched = checks.filter(item => item.status === 'mismatch').length;
  const unknown = checks.filter(item => item.status === 'unknown').length;
  const classification = mismatched ? 'requires-local-validation' : (unknown ? 'transferability-uncertain' : 'strong-transfer-lead');
  return { classification, matched, mismatched, unknown, checks, effectsImported: false, causalEffectTransferred: false };
}

function whyNot(ranked, statusQuo, gates = {}) {
  const eligible = ranked.filter(item => item.recommendationEligible && item.score != null);
  const winner = eligible[0] || null;
  const reasons = ranked.filter(item => !winner || item.candidateId !== winner.candidateId).map(item => ({
    candidateId: item.candidateId,
    reasons: [
      !item.evidenceComplete ? 'evidence-incomplete' : null,
      item.recommendationEligible === false && !item.evidenceComplete ? 'not-evidence-eligible' : null,
      item.score == null ? 'not-scoreable' : null,
      winner && item.score != null && item.score < winner.score ? 'lower-supported-value' : null
    ].filter(Boolean)
  }));
  const statusQuoReason = statusQuo?.explicit === true
    ? { candidateId: 'status-quo', preserved: true, compared: Boolean(winner), reason: winner ? 'explicit-counterfactual' : 'no-supported-option-beats-status-quo' }
    : { candidateId: 'status-quo', preserved: false, reason: 'status-quo-missing' };
  return { winner: winner?.candidateId || null, alternatives: reasons, statusQuo: statusQuoReason, gates };
}

function robustnessGate({ baselineWinner, scenarios = [], uncertaintyWinners = [], voiStatus = 'not-computable', statusQuoExplicit = false } = {}) {
  const winners = unique([baselineWinner, ...uncertaintyWinners, ...scenarios.map(item => item.winner)]);
  const flip = winners.some(winner => winner !== baselineWinner);
  return {
    statusQuoExplicit,
    recommendationFlip: flip,
    stable: Boolean(baselineWinner && statusQuoExplicit && !flip && voiStatus === 'complete'),
    recommendationBlockedReasons: [
      !statusQuoExplicit ? 'status-quo-missing' : null,
      flip ? 'recommendation-flips-under-sensitivity' : null,
      voiStatus !== 'complete' ? 'voi-incomplete' : null,
      !baselineWinner ? 'no-baseline-winner' : null
    ].filter(Boolean)
  };
}

function recordOutcome(decision, outcome) {
  if (!decision || !outcome) throw new Error('outcome-record-input-required');
  return {
    decisionId: decision.decisionId || decision.id || hash(decision).slice(0, 16),
    baselineDecisionHash: decision.baselineHash || hash(decision),
    outcomeHash: hash(outcome),
    observedAt: outcome.observedAt || null,
    predicted: outcome.predicted ?? null,
    observed: outcome.observed ?? null,
    deviation: Number.isFinite(Number(outcome.observed)) && Number.isFinite(Number(outcome.predicted)) ? Number(outcome.observed) - Number(outcome.predicted) : null,
    learningStatus: 'outcome-review-required',
    historyRewrite: false,
    automaticParameterMutation: false
  };
}

function proposeRecalibration(outcomeRecords = [], policy = {}) {
  const valid = outcomeRecords.filter(record => Number.isFinite(Number(record.deviation)));
  if (!valid.length) return { status: 'insufficient-outcomes', proposedAdjustment: null, governed: true };
  const meanDeviation = valid.reduce((sum, record) => sum + Number(record.deviation), 0) / valid.length;
  const threshold = Number.isFinite(Number(policy.threshold)) ? Math.abs(Number(policy.threshold)) : Infinity;
  return {
    status: Math.abs(meanDeviation) > threshold ? 'recalibration-review-required' : 'monitor',
    proposedAdjustment: meanDeviation,
    sampleSize: valid.length,
    governed: true,
    automaticMutation: false,
    historyRewrite: false
  };
}

function buildDecisionIntelligence({ problem, context = {}, sourceResults = [], comparableCities = [], candidates = null, evidenceIndex = {}, analysis = {}, statusQuo = null } = {}) {
  const strategy = buildSearchStrategy(problem, context);
  const universe = candidates ? { candidates, candidateUniverseHash: hash(candidates) } : buildCandidateUniverse(sourceResults, comparableCities);
  const coverage = auditSearchCoverage(strategy, sourceResults);
  const ranked = rankCandidates(universe.candidates, evidenceIndex, analysis);
  const transferLeads = universe.candidates.filter(candidate => candidate.leadOnly).map(candidate => ({
    candidateId: candidate.id,
    name: candidate.name,
    transferability: assessTransferability(candidate.transferability || candidate, context)
  }));
  const why = whyNot(ranked, statusQuo, { discoveryComplete: coverage.complete });
  const learning = { historyRewrite: false, automaticParameterMutation: false, governedRecalibration: true, outcomeReviewRequired: true };
  return {
    strategy,
    discovery: { coverage, universe, transferLeads },
    ranking: ranked,
    whyNot: why,
    governance: {
      unknownIsNotZero: true,
      comparableEffectsImported: false,
      statusQuoExplicit: Boolean(statusQuo?.explicit === true),
      recommendationRequiresEvidence: true,
      recommendationRequiresStableSensitivity: true,
      recommendationRequiresVOI: true,
      failedSourceBlocksRecommendation: coverage.failed.length > 0,
      learning
    }
  };
}

module.exports = {
  SOURCE_ORDER,
  stable,
  hash,
  buildSearchStrategy,
  buildCandidateUniverse,
  auditSearchCoverage,
  evidenceGate,
  rankCandidates,
  assessTransferability,
  whyNot,
  robustnessGate,
  recordOutcome,
  proposeRecalibration,
  buildDecisionIntelligence
};
