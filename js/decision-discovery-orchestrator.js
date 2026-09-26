'use strict';

const crypto = require('node:crypto');
const Discovery = require('./intervention-discovery');
const ArtifactStore = require('./decision-artifact-store');

const SOURCE_TYPES = Object.freeze(['local-program', 'official-data', 'research', 'intervention-library', 'comparable-city']);
const FAILED_STATUSES = new Set(['failed', 'search-failed', 'error', 'blocked']);
const SEARCHED_STATUSES = new Set(['searched', 'searched-empty', 'candidates-found', 'candidates-matched']);

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function hash(value) {
  return crypto.createHash('sha256').update(stable(value)).digest('hex');
}

function comparableConcepts(text = '') {
  const normalized = String(text || '').toLowerCase();
  const concepts = new Set(Discovery.normalizeProblemTags(normalized));
  const groups = [
    { match: /violent\s+crime|serious\s+violence|community\s+violence/, terms: ['violent-crime', 'violence', 'safety'] },
    { match: /crime|public\s+safety/, terms: ['crime', 'violent-crime', 'safety'] },
    { match: /homeless|rough\s+sleeping|housing\s+insecurity/, terms: ['homelessness', 'housing-instability', 'shelter'] },
    { match: /overdose|opioid/, terms: ['overdose', 'opioid', 'health'] },
    { match: /traffic|pedestrian|road\s+safety|congestion/, terms: ['traffic-injury', 'road-safety', 'mobility'] },
    { match: /heat|wildfire\s+smoke|flood|climate/, terms: ['extreme-heat', 'climate', 'heat', 'flood'] }
  ];
  for (const group of groups) if (group.match.test(normalized)) group.terms.forEach(term => concepts.add(term));
  return concepts;
}

function normalizeLead(lead, source = {}) {
  if (!lead) return null;
  const id = lead.id || lead.interventionId || lead.title || null;
  if (!id) return null;
  const sourceType = source.sourceType || source.type || lead.discovery?.sourceType || 'discovery';
  const sourceId = source.sourceId || source.source || lead.discovery?.source || 'unknown';
  const provenance = [{
    sourceId,
    sourceType,
    jurisdiction: source.jurisdiction || lead.jurisdiction || lead.discovery?.jurisdiction || null,
    evidenceStatus: lead.evidenceStatus || lead.discovery?.evidenceStatus || 'potential'
  }];
  return {
    id: String(id),
    name: lead.name || lead.title || String(id),
    problemTags: Array.isArray(lead.problemTags) ? lead.problemTags : [],
    domains: Array.isArray(lead.domains) ? lead.domains : [],
    interventionFamily: Array.isArray(lead.interventionFamily) ? lead.interventionFamily : [],
    requiredEvidence: Array.isArray(lead.requiredEvidence) ? lead.requiredEvidence : ['causal', 'implementation'],
    discovery: {
      source: sourceId,
      sourceType,
      jurisdiction: source.jurisdiction || lead.jurisdiction || lead.discovery?.jurisdiction || null,
      evidenceStatus: lead.evidenceStatus || lead.discovery?.evidenceStatus || 'potential',
      comparableCity: source.comparableCity || lead.discovery?.comparableCity || null,
      leadOnly: Boolean(source.comparableCity || lead.discovery?.leadOnly),
      effectsImported: false,
      transferability: lead.transferability || lead.context || null,
      provenance
    }
  };
}

function candidateKey(candidate) {
  const name = String(candidate.name || candidate.title || candidate.id || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  // Candidate identity is the intervention itself, not the source-specific tag set.
  // The same intervention can arrive from multiple discovery channels with different
  // problem tags; retaining both copies creates duplicate options in the decision room.
  return name;
}

function trustedProvenance(candidate) {
  const discovery = candidate.discovery || {};
  const expectedSource = discovery.source || null;
  const expectedType = discovery.sourceType || null;
  const expectedJurisdiction = discovery.jurisdiction ?? null;
  const records = Array.isArray(discovery.provenance) ? discovery.provenance : [];
  return records.filter(record =>
    record &&
    record.sourceId === expectedSource &&
    record.sourceType === expectedType &&
    (expectedJurisdiction === null || record.jurisdiction === expectedJurisdiction)
  );
}

function deduplicateCandidates(candidates = []) {
  const byKey = new Map();
  for (const candidate of candidates) {
    if (!candidate?.id) continue;
    const canonical = {
      ...candidate,
      discovery: {
        ...(candidate.discovery || {}),
        provenance: trustedProvenance(candidate)
      }
    };
    const key = candidateKey(canonical);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, canonical);
      continue;
    }
    existing.problemTags = [...new Set([...(existing.problemTags || []), ...(canonical.problemTags || [])])];
    existing.domains = [...new Set([...(existing.domains || []), ...(canonical.domains || [])])];
    existing.interventionFamily = [...new Set([...(existing.interventionFamily || []), ...(canonical.interventionFamily || [])])];
    existing.requiredEvidence = [...new Set([...(existing.requiredEvidence || []), ...(canonical.requiredEvidence || [])])];
    existing.discovery.provenance = [...existing.discovery.provenance, ...canonical.discovery.provenance];
    if (canonical.discovery?.sourceType === 'comparable-city') existing.discovery.leadOnly = true;
  }
  return [...byKey.values()].map(candidate => ({
    ...candidate,
    discovery: {
      ...candidate.discovery,
      provenance: candidate.discovery?.provenance?.filter((item, index, all) => index === all.findIndex(other => stable(other) === stable(item))) || []
    }
  }));
}

function normalizeSourceSearch(source = {}, fallbackType = 'acquisition') {
  const rawStatus = source.status || 'searched';
  const count = Number.isFinite(source.candidatesReturned) ? Math.max(0, source.candidatesReturned) : 0;
  const status = FAILED_STATUSES.has(rawStatus)
    ? rawStatus
    : (SEARCHED_STATUSES.has(rawStatus) ? (count > 0 ? 'candidates-found' : 'searched-empty') : (count > 0 ? 'candidates-found' : rawStatus));
  return {
    sourceId: source.sourceId || source.id || null,
    sourceType: source.sourceType || source.type || fallbackType,
    jurisdiction: source.jurisdiction || null,
    query: source.query || null,
    status,
    candidatesReturned: count,
    provenance: source.provenance || null,
    retrievedAt: source.retrievedAt || null,
    contentHash: source.contentHash || null,
    freshness: source.freshness || null,
    validation: source.validation || null,
    failureReason: source.failureReason || (FAILED_STATUSES.has(status) ? 'source-search-failed' : null)
  };
}

function buildSearchManifest({ problem, acquisitionSources = [], localCandidates = [], acquiredCandidates = [], researchLeads = [], comparableCities = [], requiredSourceTypes = SOURCE_TYPES } = {}) {
  const inferred = [
    ...localCandidates.map(() => ({ sourceId: 'local-program-registry', sourceType: 'local-program', candidatesReturned: localCandidates.length })),
    ...acquiredCandidates.map(() => ({ sourceId: 'acquired-intervention-universe', sourceType: 'intervention-library', candidatesReturned: acquiredCandidates.length })),
    ...researchLeads.map(() => ({ sourceId: 'research-discovery', sourceType: 'research', candidatesReturned: researchLeads.length })),
    ...comparableCities.map(() => ({ sourceId: 'comparable-city-learning', sourceType: 'comparable-city', candidatesReturned: comparableCities.length }))
  ];
  const explicit = acquisitionSources.map(source => normalizeSourceSearch(source));
  const grouped = new Map();
  for (const search of [...explicit, ...inferred]) {
    const key = `${search.sourceType}:${search.sourceId}`;
    if (!grouped.has(key)) grouped.set(key, search);
    else if (search.candidatesReturned > grouped.get(key).candidatesReturned) grouped.get(key).candidatesReturned = search.candidatesReturned;
  }
  for (const type of requiredSourceTypes) {
    if (![...grouped.values()].some(search => search.sourceType === type)) {
      grouped.set(`${type}:not-searched`, {
        sourceId: null, sourceType: type, jurisdiction: null, query: problem, status: 'not-searched', candidatesReturned: 0,
        provenance: null, retrievedAt: null, contentHash: null, freshness: null, validation: null, failureReason: null
      });
    }
  }
  return [...grouped.values()].sort((a, b) => `${a.sourceType}:${a.sourceId || ''}`.localeCompare(`${b.sourceType}:${b.sourceId || ''}`));
}

function comparableCityLeads({ problem, cities = [], minSignals = 1 } = {}) {
  const problemSignals = new Set(Discovery.normalizeProblemTags(problem));
  const problemConcepts = comparableConcepts(problem);
  const interventionFields = ['interventions', 'programs', 'initiatives', 'strategies', 'solutions'];
  return cities.map(city => {
    const contextText = [
      city.problem,
      ...(Array.isArray(city.problemTags) ? city.problemTags : []),
      ...(Array.isArray(city.matchedSignals) ? city.matchedSignals : [])
    ].filter(Boolean).join(' ');
    const contextSignals = Discovery.normalizeProblemTags(contextText);
    const signals = contextSignals.filter(signal => problemSignals.has(signal));
    const contextConcepts = comparableConcepts(contextText);
    const conceptMatch = [...contextConcepts].some(concept => problemConcepts.has(concept));
    const interventions = interventionFields.flatMap(field => {
      const values = Array.isArray(city?.[field]) ? city[field] : city?.[field] ? [city[field]] : [];
      return values.map(value => typeof value === 'string'
        ? value.trim()
        : String(value?.name || value?.title || '').trim()).filter(Boolean);
    });
    const directMatches = interventions.filter(name => Discovery.normalizeProblemTags(name).some(signal => problemSignals.has(signal)) || [...comparableConcepts(name)].some(concept => problemConcepts.has(concept)));
    const matchedInterventions = [...new Set(interventions)];
    const matchedSignals = [...new Set(signals)];

    return {
      city: city.city || null,
      jurisdiction: city.jurisdiction || city.city || null,
      matchedSignals: [...new Set([...matchedSignals, ...directMatches.flatMap(name => Discovery.normalizeProblemTags(name))])],
      interventions: matchedInterventions,
      conceptMatch,
      transferability: city.transferability || city.context || null,
      leadOnly: true,
      effectsImported: false,
      provenance: city.provenance || null
    };
  }).filter(item => item.city && item.interventions.length &&
    (item.matchedSignals.length >= minSignals || item.conceptMatch));
}

function runUncertaintySensitivityVOI({ candidates = [], analysisInputs = {} } = {}) {
  const eligible = candidates.filter(candidate => candidate.evidenceState === 'evidence-complete');
  if (!eligible.length) return { status: 'blocked', reason: 'no-evidence-complete-candidates', candidates: [], recommendationFlip: false, voi: { status: 'not-computable' } };
  const analyzed = eligible.map(candidate => {
    const input = analysisInputs[candidate.id] || {};
    const estimate = Number(input.estimate);
    const uncertainty = input.uncertainty || null;
    const validEstimate = Number.isFinite(estimate);
    const validUncertainty = uncertainty && Number.isFinite(Number(uncertainty.low)) && Number.isFinite(Number(uncertainty.high)) && Number(uncertainty.high) >= Number(uncertainty.low);
    const scenarios = Array.isArray(input.scenarios) ? input.scenarios.filter(s => Number.isFinite(Number(s.value))) : [];
    return { candidateId: candidate.id, baseline: validEstimate ? estimate : null, uncertainty: validUncertainty ? { low: Number(uncertainty.low), high: Number(uncertainty.high) } : null, scenarios, status: validEstimate && validUncertainty ? 'analyzable' : 'insufficient-quantitative-input' };
  });
  const analyzable = analyzed.filter(item => item.status === 'analyzable');
  if (analyzable.length !== eligible.length) return { status: 'incomplete', candidates: analyzed, recommendationFlip: null, voi: { status: 'not-computable', reason: 'quantitative-uncertainty-input-missing' } };
  const baselineWinner = analyzable.slice().sort((a, b) => b.baseline - a.baseline || a.candidateId.localeCompare(b.candidateId))[0].candidateId;
  const lowWinner = analyzable.slice().sort((a, b) => b.uncertainty.low - a.uncertainty.low || a.candidateId.localeCompare(b.candidateId))[0].candidateId;
  const highWinner = analyzable.slice().sort((a, b) => b.uncertainty.high - a.uncertainty.high || a.candidateId.localeCompare(b.candidateId))[0].candidateId;
  const scenarioWinners = [];
  const maxScenarioCount = Math.max(0, ...analyzable.map(item => item.scenarios.length));
  for (let i = 0; i < maxScenarioCount; i++) {
    const available = analyzable.map(item => ({ candidateId: item.candidateId, value: item.scenarios[i]?.value })).filter(item => Number.isFinite(item.value));
    if (available.length) scenarioWinners.push({ scenario: i, winner: available.sort((a, b) => b.value - a.value || a.candidateId.localeCompare(b.candidateId))[0].candidateId });
  }
  const flips = [lowWinner, highWinner, ...scenarioWinners.map(item => item.winner)].filter(winner => winner !== baselineWinner);
  const rawVoiInputs = analyzable.map(item => analysisInputs[item.candidateId]?.voi);
  const validVoi = rawVoiInputs.length === analyzable.length && rawVoiInputs.every(value => Number.isFinite(Number(value)) && Number(value) >= 0);
  const voi = validVoi
    ? { status: 'complete', expectedValueOfInformation: Math.max(...rawVoiInputs.map(Number)), basis: 'caller-supplied candidate-level VOI inputs' }
    : { status: 'not-computable', reason: 'candidate-level-voi-input-missing-or-invalid' };
  return { status: 'complete', candidates: analyzed, baselineWinner, sensitivity: { lowWinner, highWinner, scenarioWinners, recommendationFlip: flips.length > 0 }, recommendationFlip: flips.length > 0, voi };
}

function buildDiscoveryRun({ problem, acquisitionSources = [], researchLeads = [], localCandidates = [], acquiredCandidates = [], comparableCities = [], evidenceIndex = {}, analysisInputs = {}, requiredSourceTypes = SOURCE_TYPES, statusQuo = null, decisionContext = {} } = {}) {
  if (!problem || typeof problem !== 'string' || !problem.trim()) throw new Error('decision-discovery-problem-required');
  const comparable = comparableCityLeads({ problem, cities: comparableCities });
  const comparableCandidates = comparable.flatMap(city => city.interventions.map(intervention => normalizeLead({
    id: `${String(city.city).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${String(intervention).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: intervention, problemTags: city.matchedSignals, evidenceStatus: 'potential'
  }, { sourceId: 'comparable-city-learning', sourceType: 'comparable-city', jurisdiction: city.jurisdiction, comparableCity: city.city })));
  const normalizedResearch = researchLeads.map(lead => normalizeLead(lead, { sourceId: 'research-discovery', sourceType: 'research', jurisdiction: lead.jurisdiction })).filter(Boolean);
  const normalizedAcquired = acquiredCandidates.map(lead => normalizeLead(lead, { sourceId: 'acquired-intervention-universe', sourceType: 'intervention-library', jurisdiction: lead.jurisdiction })).filter(Boolean);
  const normalizedLocal = localCandidates.map(lead => normalizeLead(lead, { sourceId: 'local-program-registry', sourceType: 'local-program', jurisdiction: lead.jurisdiction })).filter(Boolean);
  const allCandidates = deduplicateCandidates([...normalizedAcquired, ...normalizedLocal, ...normalizedResearch, ...comparableCandidates]);
  const candidates = Discovery.discoverInterventions({ problem, candidates: allCandidates, acquiredCandidates: [], localProgramIndex: [], evidenceIndex });
  const sourceSearches = buildSearchManifest({ problem, acquisitionSources, localCandidates, acquiredCandidates, researchLeads, comparableCities, requiredSourceTypes });
  const failedSources = sourceSearches.filter(source => FAILED_STATUSES.has(source.status)).map(source => source.sourceId || `${source.sourceType}:unknown`);
  const unsearchedSources = sourceSearches.filter(source => source.status === 'not-searched').map(source => source.sourceType);
  const audit = Discovery.discoveryAudit({ problem, candidates: allCandidates, evidenceIndex, sourceSearches });
  audit.status = failedSources.length ? 'search-incomplete' : (candidates.length ? 'candidates-found' : 'no-candidates-found');
  audit.discoverySearchComplete = failedSources.length === 0 && unsearchedSources.length === 0;
  audit.sourceSearchFailures = failedSources;
  audit.unsearchedSourceTypes = unsearchedSources;
  audit.candidateUniverseHash = Discovery.hashCandidateUniverse(allCandidates.map(candidate => ({ id: candidate.id, name: candidate.name, problemTags: candidate.problemTags, domains: candidate.domains, sourceType: candidate.discovery?.sourceType, provenance: candidate.discovery?.provenance })));
  const evidenceGaps = candidates.map(candidate => ({ candidateId: candidate.id, missingEvidence: candidate.missingEvidence, evidenceState: candidate.evidenceState, evidence: candidate.evidence }));
  const blockedCandidates = candidates.filter(candidate => candidate.evidenceState === 'evidence-gap').map(candidate => candidate.id);
  const analysis = runUncertaintySensitivityVOI({ candidates, analysisInputs });
  const evidenceComplete = candidates.filter(candidate => candidate.evidenceState === 'evidence-complete');
  const statusQuoExplicit = Boolean(statusQuo && statusQuo.explicit === true);
  const recommendationAllowed = Boolean(
    statusQuoExplicit && audit.discoverySearchComplete && evidenceComplete.length && analysis.status === 'complete' && !analysis.recommendationFlip && analysis.voi.status === 'complete'
  );
  const decisionStatus = recommendationAllowed ? 'recommendation-permitted' : 'recommendation-blocked';
  const learning = {
    historyRewrite: false, automaticParameterMutation: false, outcomeReviewRequired: true, recalibrationIsGoverned: true,
    baselineHash: hash({ problem, candidates, sourceSearches, evidenceGaps })
  };
  const counterfactual = { statusQuo: statusQuo || { preserved: true, explicit: false }, alternatives: candidates.map(candidate => candidate.id), selected: null, recommendationStatus: decisionStatus };
  const decision = {
    ...decisionContext, problem, status: decisionStatus, recommendation: recommendationAllowed ? analysis.baselineWinner : null, recommendationAllowed,
    reason: recommendationAllowed ? 'all discovery, status quo, evidence, sensitivity and VOI gates passed' : 'one or more pre-recommendation gates remain unresolved'
  };
  const governance = {
    recommendationAllowed, decisionStatus, blockedCandidates, noCandidatesFound: candidates.length === 0, sourceSearchFailures: failedSources, unsearchedSourceTypes: unsearchedSources,
    effectsImportedFromComparableCities: false, unknownIsNotZero: true, requiresHumanReviewWhenEvidenceIncomplete: true,
    recommendationRequiresExplicitStatusQuo: true, statusQuoExplicit, recommendationRequiresStableSensitivity: true, recommendationRequiresVOI: true, historyRewrite: false, learningEffectsImported: false
  };
  const run = {
    schemaVersion: 'vidik.decision-discovery.v2', problem, problemSignals: Discovery.normalizeProblemTags(problem), discoveryAudit: audit, sourceSearches, candidates, evidenceGaps,
    comparableCityLeads: comparable, analysis, counterfactual, decision, governance, learning
  };
  run.runHash = hash(run);
  return run;
}

function buildDecisionArtifact(run, overrides = {}) {
  if (!run || typeof run !== 'object') throw new Error('decision-discovery-run-required');
  return ArtifactStore.artifact({
    decisionId: overrides.decisionId || `DISCOVERY-${run.runHash?.slice(0, 16) || hash(run).slice(0, 16)}`,
    decision: overrides.decision || run.decision, audit: overrides.audit || run.discoveryAudit, counterfactual: overrides.counterfactual || run.counterfactual,
    evidence: overrides.evidence || { candidates: run.candidates, gaps: run.evidenceGaps, sourceSearches: run.sourceSearches }, parameters: overrides.parameters || { analysis: run.analysis },
    analysis: overrides.analysis || run.analysis, governance: overrides.governance || run.governance, learning: overrides.learning || run.learning,
    provenance: overrides.provenance || { runHash: run.runHash, candidateUniverseHash: run.discoveryAudit.candidateUniverseHash }
  });
}

function persistDecisionArtifact(file, run, overrides = {}) {
  return ArtifactStore.append(file, buildDecisionArtifact(run, overrides));
}

module.exports = { SOURCE_TYPES, comparableCityLeads, normalizeLead, normalizeSourceSearch, deduplicateCandidates, buildSearchManifest, runUncertaintySensitivityVOI, buildDiscoveryRun, buildDecisionArtifact, persistDecisionArtifact };
