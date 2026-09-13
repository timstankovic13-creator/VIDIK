'use strict';

const crypto = require('node:crypto');
const Discovery = require('./intervention-discovery');

function hash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizeLead(lead, source = {}) {
  if (!lead) return null;
  const id = lead.id || lead.interventionId || lead.title || null;
  if (!id) return null;
  return {
    id: String(id),
    name: lead.name || lead.title || String(id),
    problemTags: Array.isArray(lead.problemTags) ? lead.problemTags : [],
    domains: Array.isArray(lead.domains) ? lead.domains : [],
    requiredEvidence: Array.isArray(lead.requiredEvidence) ? lead.requiredEvidence : ['causal', 'implementation'],
    discovery: {
      source: source.sourceId || source.source || 'unknown',
      sourceType: source.sourceType || 'discovery',
      jurisdiction: source.jurisdiction || null,
      evidenceStatus: lead.evidenceStatus || 'potential',
      comparableCity: source.comparableCity || null
    }
  };
}

function comparableCityLeads({ problem, cities = [], minSignals = 1 } = {}) {
  const problemSignals = new Set(Discovery.normalizeProblemTags(problem));
  return cities.map(city => {
    const citySignals = Discovery.normalizeProblemTags(`${city.problem || ''} ${Array.isArray(city.interventions) ? city.interventions.join(' ') : city.interventions || ''}`);
    const signals = citySignals.filter(signal => problemSignals.has(signal));
    return {
      city: city.city || null,
      jurisdiction: city.jurisdiction || city.city || null,
      matchedSignals: [...new Set(signals)],
      interventions: Array.isArray(city.interventions) ? city.interventions : [city.interventions].filter(Boolean),
      leadOnly: true,
      effectsImported: false
    };
  }).filter(item => item.city && item.matchedSignals.length >= minSignals && item.interventions.length);
}

function buildDiscoveryRun({ problem, acquisitionSources = [], researchLeads = [], localCandidates = [], acquiredCandidates = [], comparableCities = [], evidenceIndex = {} } = {}) {
  if (!problem || typeof problem !== 'string' || !problem.trim()) throw new Error('decision-discovery-problem-required');

  const comparable = comparableCityLeads({ problem, cities: comparableCities });
  const comparableCandidates = comparable.flatMap(city => city.interventions.map(intervention => normalizeLead({
    id: `${String(city.city).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${String(intervention).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: intervention,
    problemTags: city.matchedSignals,
    evidenceStatus: 'potential'
  }, { sourceId: 'comparable-city-learning', sourceType: 'comparable-city', jurisdiction: city.jurisdiction, comparableCity: city.city })));

  const normalizedResearch = researchLeads.map(lead => normalizeLead(lead, { sourceId: 'research-discovery', sourceType: 'research', jurisdiction: lead.jurisdiction })).filter(Boolean);
  const normalizedAcquired = acquiredCandidates.map(lead => normalizeLead(lead, { sourceId: 'acquired-intervention-universe', sourceType: 'acquired', jurisdiction: lead.jurisdiction })).filter(Boolean);
  const normalizedLocal = localCandidates.map(lead => normalizeLead(lead, { sourceId: 'local-program-registry', sourceType: 'local-program', jurisdiction: lead.jurisdiction })).filter(Boolean);

  const allCandidates = [...normalizedAcquired, ...normalizedLocal, ...normalizedResearch, ...comparableCandidates];
  const candidates = Discovery.discoverInterventions({
    problem,
    candidates: allCandidates,
    acquiredCandidates: [],
    localProgramIndex: [],
    evidenceIndex
  });

  const sourceSearches = acquisitionSources.map(source => ({
    sourceId: source.sourceId || source.id || null,
    sourceType: source.sourceType || source.type || 'acquisition',
    status: source.status || 'searched',
    candidatesReturned: Number.isFinite(source.candidatesReturned) ? source.candidatesReturned : 0
  }));

  const audit = Discovery.discoveryAudit({
    problem,
    candidates: allCandidates,
    sourceSearches: [
      ...sourceSearches,
      { sourceId: 'local-program-registry', sourceType: 'local-program', status: normalizedLocal.length ? 'candidates-found' : 'searched-empty', candidatesReturned: normalizedLocal.length },
      { sourceId: 'acquired-intervention-universe', sourceType: 'acquired', status: normalizedAcquired.length ? 'candidates-found' : 'searched-empty', candidatesReturned: normalizedAcquired.length },
      { sourceId: 'research-discovery', sourceType: 'research', status: 'candidates-found', candidatesReturned: normalizedResearch.length },
      { sourceId: 'comparable-city-learning', sourceType: 'comparable-city', status: comparableCandidates.length ? 'candidates-found' : 'searched-empty', candidatesReturned: comparableCandidates.length }
    ]
  });

  const gaps = candidates.map(candidate => ({ candidateId: candidate.id, missingEvidence: candidate.missingEvidence, evidenceState: candidate.evidenceState }));
  const blocked = candidates.filter(candidate => candidate.evidenceState !== 'evidence-complete').map(candidate => candidate.id);
  const failedSources = sourceSearches.filter(source => ['failed', 'search-failed', 'error', 'blocked'].includes(source.status)).map(source => source.sourceId).filter(Boolean);

  return {
    schemaVersion: 'vidik.decision-discovery.v1',
    problem,
    problemSignals: Discovery.normalizeProblemTags(problem),
    discoveryAudit: audit,
    candidates,
    evidenceGaps: gaps,
    comparableCityLeads: comparable,
    governance: {
      recommendationAllowed: candidates.some(candidate => candidate.evidenceState === 'evidence-complete') && failedSources.length === 0,
      blockedCandidates: blocked,
      noCandidatesFound: candidates.length === 0,
      sourceSearchFailures: failedSources,
      effectsImportedFromComparableCities: false,
      unknownIsNotZero: true,
      requiresHumanReviewWhenEvidenceIncomplete: true
    },
    runHash: hash({ problem, audit, candidates, gaps, comparable, failedSources })
  };
}

module.exports = { comparableCityLeads, buildDiscoveryRun, normalizeLead };