'use strict';

const crypto = require('node:crypto');
const Discovery = require('./intervention-discovery');
const Promotion = require('./evidence-promotion-gate');
const Closure = require('./vidik-decision-artifact-closure');
const DecisionIntelligence = require('./decision-intelligence-9.7');
const ResourceOptimization = require('./vidik-resource-optimization');

const sha256 = value => crypto.createHash('sha256').update(JSON.stringify(value, Object.keys(value || {}).sort())).digest('hex');
const finite = value => Number.isFinite(Number(value));

function canonicalCandidate(candidate, sourceId) {
  if (!candidate || !candidate.id) throw new Error('open-world-candidate-id-required');
  const forbidden = ['effect', 'causalEffect', 'estimate', 'effectPerCad', 'expectedEffect', 'score', 'value'];
  const leaked = forbidden.filter(key => candidate[key] !== undefined);
  if (leaked.length) throw new Error(`discovery-effect-leak:${candidate.id}:${leaked.join(',')}`);
  return {
    id: String(candidate.id),
    name: String(candidate.name || candidate.id),
    domains: Array.isArray(candidate.domains) ? [...new Set(candidate.domains.map(String))] : [],
    problemTags: Array.isArray(candidate.problemTags) ? [...new Set(candidate.problemTags.map(String))] : [],
    requiredEvidence: Array.isArray(candidate.requiredEvidence) ? [...new Set(candidate.requiredEvidence.map(String))] : ['causal', 'implementation', 'cost', 'equity'],
    discovery: {
      source: 'open-world-acquisition',
      sourceId: sourceId || null,
      leadOnly: true,
      provenance: candidate.provenance || []
    }
  };
}

async function discoverOpenWorldInterventions({ problem, discoverySources = [], fallbackRegistry = [] } = {}) {
  if (!String(problem || '').trim()) throw new Error('open-world-problem-required');
  const sources = Array.isArray(discoverySources) ? discoverySources : [];
  const results = [];
  const sourceSearches = [];
  const seen = new Set();
  for (const source of sources) {
    const sourceId = String(source?.id || 'unknown-source');
    const startedAt = new Date().toISOString();
    try {
      if (typeof source?.search !== 'function') throw new Error('discovery-source-search-unavailable');
      const raw = await source.search({ problem });
      if (!Array.isArray(raw)) throw new Error('discovery-source-invalid-result');
      let accepted = 0;
      for (const candidate of raw) {
        const normalized = canonicalCandidate(candidate, sourceId);
        if (seen.has(normalized.id)) continue;
        seen.add(normalized.id);
        results.push(normalized);
        accepted += 1;
      }
      sourceSearches.push({ sourceId, status: 'success', candidatesReturned: raw.length, candidatesAccepted: accepted, startedAt, completedAt: new Date().toISOString() });
    } catch (error) {
      sourceSearches.push({ sourceId, status: 'failed', candidatesReturned: 0, failureReason: error.message, startedAt, completedAt: new Date().toISOString() });
    }
  }
  // The legacy registry is explicitly non-authoritative. It is allowed only as a
  // diagnostic comparison and can never make an open-world run complete.
  const registryMatches = Discovery.discoverInterventions({ problem, candidates: fallbackRegistry }).map(c => c.id);
  const complete = sources.length > 0 && sourceSearches.every(s => s.status === 'success') && results.length > 0;
  return {
    schemaVersion: 'vidik.open-world-discovery.v1',
    problem: String(problem).trim(),
    candidates: results,
    sourceSearches,
    sourceCount: sources.length,
    candidateCount: results.length,
    registryDiagnosticMatches: registryMatches,
    openWorld: true,
    complete,
    failureState: complete ? null : (sources.length === 0 ? 'no-discovery-sources' : results.length === 0 ? 'no-candidates-discovered' : 'source-acquisition-incomplete'),
    discoveryHash: sha256({ problem, results, sourceSearches })
  };
}

async function acquireEvidenceForCandidates({ candidates = [], evidenceSources = [], targetJurisdiction } = {}) {
  const evidenceDiscovery = {};
  const allLeads = [];
  for (const candidate of candidates) {
    const sourceResults = [];
    for (const source of evidenceSources) {
      const sourceId = String(source?.id || 'unknown-evidence-source');
      try {
        if (typeof source?.search !== 'function') throw new Error('evidence-source-search-unavailable');
        const raw = await source.search({ candidate, problem: candidate.problem || null, targetJurisdiction });
        if (!Array.isArray(raw)) throw new Error('evidence-source-invalid-result');
        for (const lead of raw) {
          if (!lead || !lead.id || !lead.provenance?.externalId) throw new Error(`evidence-lead-provenance-missing:${candidate.id}`);
          if (lead.effect !== undefined || lead.causalEffect !== undefined || lead.estimate !== undefined || lead.parameter !== undefined) throw new Error(`evidence-effect-leak:${candidate.id}`);
          const normalized = {
            ...lead,
            id: String(lead.id),
            candidateId: candidate.id,
            sourceId,
            evidenceLeadOnly: true,
            causalEffectImported: false,
            provenance: { ...lead.provenance, sourceId, externalId: String(lead.provenance.externalId) }
          };
          allLeads.push(normalized);
        }
        sourceResults.push({ sourceId, status: 'success', leadsReturned: raw.length });
      } catch (error) {
        sourceResults.push({ sourceId, status: 'failed', leadsReturned: 0, failureReason: error.message });
      }
    }
    evidenceDiscovery[candidate.id] = { candidateId: candidate.id, evidenceLeads: allLeads.filter(l => l.candidateId === candidate.id), sourceResults, status: sourceResults.length && sourceResults.some(s => s.status === 'success') ? 'found' : 'failed' };
  }
  const missingCandidates = candidates.filter(c => !(evidenceDiscovery[c.id]?.evidenceLeads || []).length).map(c => c.id);
  return { schemaVersion: 'vidik.candidate-evidence-acquisition.v1', evidenceDiscovery, evidenceLeads: allLeads, missingCandidates, complete: candidates.length > 0 && missingCandidates.length === 0, acquisitionHash: sha256({ evidenceDiscovery, allLeads, missingCandidates }) };
}

function buildVerifiedParameters({ candidates = [], evidenceLeads = [], verifications = {}, targetJurisdiction } = {}) {
  const byCandidate = {};
  const failures = {};
  for (const candidate of candidates) {
    const leads = evidenceLeads.filter(lead => lead.candidateId === candidate.id);
    const promoted = [];
    for (const lead of leads) {
      const verification = verifications[lead.id] || null;
      const gate = Promotion.assessEvidencePromotion({ lead, verification, targetJurisdiction, requiredEvidence: candidate.requiredEvidence });
      if (gate.eligible) promoted.push(gate.verifiedParameter);
      else failures[lead.id] = gate.reasons;
    }
    if (promoted.length) byCandidate[candidate.id] = promoted[0];
  }
  const missing = candidates.filter(c => !byCandidate[c.id]).map(c => c.id);
  return { schemaVersion: 'vidik.verified-parameter-set.v1', parametersByCandidate: byCandidate, failures, missingCandidates: missing, complete: candidates.length > 0 && missing.length === 0, parameterHash: sha256(byCandidate) };
}

function buildOptimizerInputs({ candidates, verifiedParameters, resourceEnvelope, objectiveMetric }) {
  const comparison = [];
  const models = {};
  for (const candidate of candidates) {
    const p = verifiedParameters.parametersByCandidate[candidate.id];
    if (!p) continue;
    const unit = String(p.unit || 'outcome_units');
    // The optimizer's chain is assembled from verified parameters only. No
    // numerical value is read from discovery candidates.
    const estimate = Number(p.estimate);
    const low = Number(p.uncertainty.low), high = Number(p.uncertainty.high);
    if (![estimate, low, high].every(finite) || low > high) continue;
    models[candidate.id] = {
      resourceUnit: resourceEnvelope.marginalUnit.unit,
      capacityPerCad: 1,
      activityPerCapacity: 1,
      effectPerActivity: estimate,
      objectiveMetric: objectiveMetric || unit,
      capacityUnit: 'resource-units',
      activityUnit: 'activity-units',
      effectUnit: unit,
      uncertainty: { low, high },
      evidenceIds: [p.sourceId, p.externalId, p.verificationId].filter(Boolean)
    };
    comparison.push({ id: candidate.id, name: candidate.name, status: 'ADMISSIBLE', source: 'verified-parameter' });
  }
  return { comparison, models };
}

function analyzeSameDecisionInputs({ baseline, parameters, correlations, scoreFn, voiCandidates, sensitivitySteps = 21, uncertaintySamples = 2000, decisionValue = 1 }) {
  return DecisionIntelligence.analyze({ baseline, parameters, correlations, scoreFn, candidates: voiCandidates, sensitivitySteps, uncertaintySamples, decisionValue });
}

function certifyClosedLoop({ discovery, evidence, verified, optimizer, analysis, statusQuo, opportunityCost, artifact, learning }) {
  const reasons = [];
  if (!discovery?.complete || discovery.candidateCount === 0) reasons.push('open-world-discovery-incomplete');
  if (!evidence?.complete) reasons.push('candidate-evidence-acquisition-incomplete');
  if (!verified?.complete) reasons.push('independent-verification-incomplete');
  if (optimizer?.status !== 'OPTIMIZED') reasons.push('canonical-optimizer-not-optimized');
  if (!analysis?.integrityHash || analysis.version !== DecisionIntelligence.VERSION) reasons.push('canonical-decision-intelligence-invalid');
  if (!statusQuo?.explicit) reasons.push('status-quo-missing');
  if (!opportunityCost || opportunityCost.foregoneIntervention === undefined) reasons.push('opportunity-cost-missing');
  if (!artifact?.valid) reasons.push('decision-artifact-incomplete');
  if (!learning?.historyImmutable || learning?.automaticParameterMutation) reasons.push('learning-history-not-immutable');
  return { eligible: reasons.length === 0, reasons, boundary: reasons.length ? 'FAIL_CLOSED' : 'RECOMMENDATION_ELIGIBLE', certificationHash: sha256({ discovery, evidence, verified, optimizer, analysis, statusQuo, opportunityCost, artifact, learning }) };
}

async function runOpenWorldDecision({ problem, objective, discoverySources = [], evidenceSources = [], verifications = {}, targetJurisdiction, resourceEnvelope, objectiveMetric, baseline, parameters = [], correlations = [], scoreFn, voiCandidates = [], statusQuo, selectedArtifact = null, observations = [], fallbackRegistry = [] } = {}) {
  const discovery = await discoverOpenWorldInterventions({ problem, discoverySources, fallbackRegistry });
  const evidence = await acquireEvidenceForCandidates({ candidates: discovery.candidates, evidenceSources, targetJurisdiction });
  const verified = buildVerifiedParameters({ candidates: discovery.candidates, evidenceLeads: evidence.evidenceLeads, verifications, targetJurisdiction });
  const optimizerInputs = buildOptimizerInputs({ candidates: discovery.candidates, verifiedParameters: verified, resourceEnvelope, objectiveMetric });
  const optimizer = ResourceOptimization.evaluateResourceOptimization(resourceEnvelope, optimizerInputs.comparison, optimizerInputs.models);
  const sameParameters = parameters.length ? parameters : Object.entries(verified.parametersByCandidate).map(([id, p]) => ({ id: `${id}.effect`, low: p.uncertainty.low, mean: p.estimate, high: p.uncertainty.high }));
  const analysis = analyzeSameDecisionInputs({ baseline: baseline || {}, parameters: sameParameters, correlations, scoreFn, voiCandidates, decisionValue: 1 });
  const artifact = selectedArtifact ? Closure.validateDecisionArtifact(selectedArtifact) : { valid: false, reasons: ['selected-artifact-missing'] };
  const learning = { historyImmutable: true, automaticParameterMutation: false, baselineArtifactHash: selectedArtifact?.artifactHash || null, observations: observations.map(o => ({ metric: o.metric, predicted: o.predicted, observed: o.observed })) };
  const certification = certifyClosedLoop({ discovery, evidence, verified, optimizer, analysis, statusQuo, opportunityCost: optimizer.opportunityCost, artifact, learning });
  return { schemaVersion: 'vidik.open-world-decision.v1', objective, problem, discovery, evidence, verified, optimizerInputs, optimizer, analysis, statusQuo, opportunityCost: optimizer.opportunityCost, artifact, learning, certification, decision: certification.eligible ? { status: 'RECOMMENDATION_ELIGIBLE', intervention: optimizer.allocation?.intervention || null } : { status: 'BLOCKED', reasons: certification.reasons } };
}

function blindTournament({ runs = [] } = {}) {
  if (!Array.isArray(runs) || !runs.length) return { passed: false, failures: ['blind-tournament-empty'] };
  const failures = [];
  for (const run of runs) {
    if (run.discovery?.openWorld !== true) failures.push(`${run.id || run.problem}:not-open-world`);
    if (run.discovery?.registryDiagnosticMatches?.length && run.discovery.candidateCount === 0) failures.push(`${run.id || run.problem}:registry-only-result`);
    if (run.discovery?.candidates?.some(c => c.discovery?.leadOnly !== true)) failures.push(`${run.id || run.problem}:non-lead-discovery-candidate`);
    if (run.verified?.parametersByCandidate && Object.keys(run.verified.parametersByCandidate).some(id => run.discovery.candidates.find(c => c.id === id && c.effect !== undefined))) failures.push(`${run.id || run.problem}:effect-from-discovery`);
    if (run.decision?.status === 'RECOMMENDATION_ELIGIBLE' && run.certification?.eligible !== true) failures.push(`${run.id || run.problem}:recommendation-boundary-bypass`);
  }
  return { schemaVersion: 'vidik.blind-tournament.v1', runCount: runs.length, failures, passed: failures.length === 0, tournamentHash: sha256(runs.map(r => ({ id: r.id, discoveryHash: r.discovery?.discoveryHash, certificationHash: r.certification?.certificationHash }))) };
}

module.exports = { discoverOpenWorldInterventions, acquireEvidenceForCandidates, buildVerifiedParameters, buildOptimizerInputs, analyzeSameDecisionInputs, certifyClosedLoop, runOpenWorldDecision, blindTournament, canonicalCandidate, sha256 };
