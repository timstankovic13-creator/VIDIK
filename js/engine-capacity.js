'use strict';

const SourceDiscovery = require('./source-driven-intervention-discovery');
const EvidenceDiscovery = require('./source-driven-evidence-discovery');
const Production = require('./production-decision-pipeline');
const Discovery = require('./intervention-discovery');
const ArtifactStore = require('./decision-artifact-store');

const JURISDICTION_ALIASES = Object.freeze({
  canada: 'CA', 'canada, ca': 'CA', ca: 'CA',
  australia: 'AU', au: 'AU',
  'united states': 'US', 'united states of america': 'US', us: 'US',
  'united kingdom': 'UK', uk: 'UK',
  international: 'international'
});

function normalizeJurisdiction(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (JURISDICTION_ALIASES[lower]) return JURISDICTION_ALIASES[lower];
  const country = lower.split(',').at(-1).trim();
  if (JURISDICTION_ALIASES[country]) return JURISDICTION_ALIASES[country];
  return raw;
}

function mergeCandidates(discovered = [], supplied = []) {
  const byKey = new Map();
  for (const candidate of [...discovered, ...supplied]) {
    if (!candidate?.id) continue;
    const key = String(candidate.canonicalName || candidate.name || candidate.id).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, candidate);
      continue;
    }
    existing.problemTags = [...new Set([...(existing.problemTags || []), ...(candidate.problemTags || [])])];
    existing.domains = [...new Set([...(existing.domains || []), ...(candidate.domains || [])])];
    existing.requiredEvidence = [...new Set([...(existing.requiredEvidence || []), ...(candidate.requiredEvidence || [])])];
    existing.discovery = {
      ...(existing.discovery || {}),
      ...(candidate.discovery || {}),
      leadOnly: Boolean((existing.discovery || {}).leadOnly || (candidate.discovery || {}).leadOnly),
      effectsImported: false,
      provenance: [...((existing.discovery || {}).provenance || []), ...((candidate.discovery || {}).provenance || [])]
    };
  }
  return [...byKey.values()];
}

async function discoverEvidenceForCandidates({ problem, candidates = [], fetchImpl, now = new Date(), limit = 20 } = {}) {
  const selected = candidates.slice(0, Math.max(0, limit));
  const results = await Promise.all(selected.map(async candidate => {
    try {
      return await EvidenceDiscovery.discoverCandidateEvidence({ problem, candidate, fetchImpl, now });
    } catch (error) {
      return {
        schemaVersion: 'vidik.source-driven-evidence-discovery.v2',
        problem,
        candidateId: candidate.id,
        evidenceLeads: [],
        evidenceComplete: false,
        recommendationEligible: false,
        effectsImported: false,
        error: error?.message || 'evidence-discovery-failed'
      };
    }
  }));
  return {
    candidatesAttempted: selected.length,
    candidatesWithLeads: results.filter(result => result.evidenceLeads?.length).length,
    leadCount: results.reduce((sum, result) => sum + (result.evidenceLeads?.length || 0), 0),
    recommendationEligible: false,
    effectsImported: false,
    results
  };
}

async function runFullCapacityEngine({
  problem,
  jurisdiction,
  sources = null,
  fetchImpl,
  now = new Date(),
  rows = 25,
  evidenceCandidateLimit = 20,
  localCandidates = [],
  acquiredCandidates = [],
  researchLeads = [],
  comparableCities = [],
  evidenceIndex = {},
  analysisInputs = {},
  requiredSourceTypes,
  statusQuo = null,
  decisionContext = {},
  verificationByEvidenceId = {},
  artifactFile = null
} = {}) {
  if (!String(problem || '').trim()) throw new Error('engine-capacity-problem-required');
  const targetJurisdiction = normalizeJurisdiction(jurisdiction || decisionContext.jurisdiction);
  const discovery = await SourceDiscovery.discoverSourceDrivenInterventions({
    problem,
    jurisdiction: targetJurisdiction,
    sources,
    fetchImpl,
    now,
    rows
  });
  const discovered = discovery.candidates || [];
  const mergedCandidates = mergeCandidates(discovered, [...acquiredCandidates, ...localCandidates]);
  const evidenceReconnaissance = await discoverEvidenceForCandidates({
    problem,
    candidates: mergedCandidates,
    fetchImpl,
    now,
    limit: evidenceCandidateLimit
  });
  const comparable = comparableCities.map(city => ({ ...city, jurisdiction: normalizeJurisdiction(city.jurisdiction || city.country) || city.jurisdiction }));
  const effectiveContext = { ...decisionContext, jurisdiction: targetJurisdiction || decisionContext.jurisdiction || null };
  const acquisitionSources = [
    ...(discovery.sourceSearches || []),
    ...((requiredSourceTypes || []).length ? [] : [])
  ];
  const run = Production.runEngine({
    problem,
    acquisitionSources,
    researchLeads,
    localCandidates,
    acquiredCandidates: mergedCandidates,
    comparableCities: comparable,
    evidenceIndex,
    analysisInputs,
    requiredSourceTypes,
    statusQuo,
    decisionContext: effectiveContext,
    verificationByEvidenceId
  });
  const operational = Production.evaluateOperationalState({
    sourceSearches: discovery.sourceSearches || run.run.sourceSearches || [],
    candidates: run.run.candidates || [],
    evidence: evidenceReconnaissance.results.flatMap(result => result.evidenceLeads || []),
    analysis: run.run.analysis,
    statusQuo
  });
  let persisted = false;
  let persistedRecord = null;
  if (artifactFile) {
    persistedRecord = ArtifactStore.append(artifactFile, run.artifact);
    persisted = true;
  }
  const readiness = Production.buildProductionReadiness({
    discoveryComplete: discovery.interventionUniverse?.discoveryComplete === true,
    evidenceVerified: run.promotion.promotedCount > 0,
    parametersAdmissible: run.promotion.promotedCount > 0,
    optimizationValid: run.run.analysis?.status === 'complete' && run.run.analysis?.recommendationFlip === false,
    decisionArtifactPersisted: persisted,
    outcomeLearningReady: true,
    operationalGate: operational
  });
  return {
    schemaVersion: 'vidik.engine-capacity.v1',
    problem,
    jurisdiction: targetJurisdiction,
    interventionDiscovery: discovery,
    candidates: mergedCandidates,
    evidenceReconnaissance,
    decisionRun: run,
    operational,
    persistence: { persisted, record: persistedRecord },
    readiness,
    discoveryAudit: Discovery.discoveryAudit({ problem, candidates: mergedCandidates, evidenceIndex, sourceSearches: discovery.sourceSearches || [] })
  };
}

module.exports = { normalizeJurisdiction, mergeCandidates, discoverEvidenceForCandidates, runFullCapacityEngine };
