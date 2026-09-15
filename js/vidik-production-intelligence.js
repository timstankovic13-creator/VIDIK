'use strict';

const crypto = require('node:crypto');
const Discovery = require('./intervention-discovery');
const Promotion = require('./evidence-promotion-gate');
const Closure = require('./vidik-decision-artifact-closure');
const DecisionIntelligence = require('./decision-intelligence-9.7');
const ResourceOptimization = require('./vidik-resource-optimization');

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
function sha256(value) { return crypto.createHash('sha256').update(stable(value)).digest('hex'); }
function finite(value) { return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)); }
function positive(value) { return finite(value) && Number(value) > 0; }

function auditInterventionUniverse({ problem, candidates = [], sourceSearches = [], statusQuo = null } = {}) {
  const normalized = candidates.filter(c => c && c.id);
  const names = new Set(normalized.map(c => String(c.name || c.id).trim().toLowerCase()));
  const families = new Set(normalized.flatMap(c => [
    ...(Array.isArray(c.interventionClasses) ? c.interventionClasses : []),
    ...(Array.isArray(c.domains) ? c.domains : []),
    ...(Array.isArray(c.problemTags) ? c.problemTags : [])
  ].map(String).map(s => s.trim().toLowerCase()).filter(Boolean)));
  const failures = sourceSearches.filter(s => ['failed', 'search-failed', 'error', 'blocked'].includes(s?.status));
  const searched = sourceSearches.filter(s => s?.status && s.status !== 'not-searched');
  const effectLeaks = normalized.filter(c => c.discovery?.effectsImported === true || c.discovery?.causalEffectImported === true || c.effect !== undefined || c.causalEffect !== undefined);
  const leadOnly = normalized.filter(c => c.discovery?.leadOnly === true);
  const provenanceGaps = normalized.filter(c => !Array.isArray(c.discovery?.provenance) || c.discovery.provenance.length === 0);
  const status = !searched.length ? 'not-searched' : failures.length ? 'incomplete' : normalized.length ? 'found' : 'empty';
  return { schemaVersion: 'vidik.production-intervention-universe.v1', problem: String(problem || '').trim(), status, candidatesConsidered: normalized.length, uniqueCandidateNames: names.size, interventionFamilies: families.size, sourcesSearched: searched.length, sourceFailures: failures.length, leadOnlyCount: leadOnly.length, effectLeaks: effectLeaks.length, provenanceGaps: provenanceGaps.length, statusQuoPresent: statusQuo?.explicit === true, recommendationBoundary: effectLeaks.length === 0 && leadOnly.length === normalized.length ? 'discovery-only' : 'violation', universeHash: sha256({ problem, candidates: normalized.map(c => ({ id: c.id, name: c.name, discovery: c.discovery })), sourceSearches }) };
}

function auditEvidencePipeline({ candidates = [], evidenceLeads = [], verifications = {}, targetJurisdiction = null } = {}) {
  const leads = evidenceLeads.filter(Boolean);
  const leadIds = new Set(leads.map(l => l.id));
  const orphanVerifications = Object.keys(verifications || {}).filter(id => !leadIds.has(id));
  const promotion = {};
  for (const lead of leads) promotion[lead.id] = Promotion.assessEvidencePromotion({ lead, verification: verifications?.[lead.id] || null, targetJurisdiction });
  const eligible = Object.values(promotion).filter(g => g.eligible);
  const unsafe = leads.filter(l => l.evidenceLeadOnly !== true || l.causalEffectImported === true);
  return { schemaVersion: 'vidik.production-evidence-pipeline.v1', candidateCount: candidates.length, evidenceLeadCount: leads.length, verifiedParameterCount: eligible.length, orphanVerificationCount: orphanVerifications.length, unsafeLeadCount: unsafe.length, promotion, recommendationBoundary: unsafe.length === 0 ? 'lead-or-verified-parameter' : 'violation', verifiedParameterHash: sha256(eligible.map(g => g.verifiedParameter)) };
}

function validateOptimization({ candidates = [], allocations = {}, budget = null, analysis = {} } = {}) {
  const rows = candidates.map(candidate => {
    const a = analysis[candidate.id] || {};
    const allocation = Number(allocations[candidate.id] || 0);
    const effect = Number(a.effect ?? a.estimate ?? a.parameter?.value);
    const resource = Number(a.resource ?? a.marginal?.resource);
    const low = Number(a.uncertainty?.low);
    const high = Number(a.uncertainty?.high);
    return { id: candidate.id, allocation, finiteInputs: finite(effect) && positive(resource), uncertaintyValid: finite(low) && finite(high) && low <= high, marginalEfficiency: positive(resource) && finite(effect) ? effect / resource : null, budgetUsed: allocation };
  });
  const used = rows.reduce((sum, row) => sum + row.allocation, 0);
  const budgetValid = budget == null || (finite(budget) && Number(budget) >= 0 && used <= Number(budget) + 1e-9);
  const resourceValid = rows.every(row => row.allocation >= 0 && row.finiteInputs && row.uncertaintyValid);
  return { schemaVersion: 'vidik.production-optimization.v1', rows, budget: budget == null ? null : Number(budget), budgetUsed: used, budgetValid, resourceValid, validated: rows.length > 0 && budgetValid && resourceValid, optimizationHash: sha256({ rows, budget }) };
}

function buildSensitivityEnvelope({ candidates = [], analysis = {}, score = null } = {}) {
  const scorer = typeof score === 'function' ? score : (candidate, effect) => effect;
  const rows = candidates.map(candidate => {
    const a = analysis[candidate.id] || {};
    const base = Number(a.effect ?? a.estimate ?? a.parameter?.value);
    const low = Number(a.uncertainty?.low);
    const high = Number(a.uncertainty?.high);
    const values = { low: scorer(candidate, low), base: scorer(candidate, base), high: scorer(candidate, high) };
    return { id: candidate.id, values, valid: finite(base) && finite(low) && finite(high) && low <= high };
  });
  const pick = key => rows.filter(r => r.valid).slice().sort((a, b) => Number(b.values[key]) - Number(a.values[key]))[0]?.id || null;
  const recommendation = { low: pick('low'), base: pick('base'), high: pick('high') };
  return { schemaVersion: 'vidik.sensitivity-envelope.v1', rows, recommendation, recommendationFlip: new Set(Object.values(recommendation).filter(Boolean)).size > 1, stable: rows.length > 0 && rows.every(r => r.valid), sensitivityHash: sha256({ rows, recommendation }) };
}

function calculateVOI({ sensitivity, decisionValue = null, informationCost = null } = {}) {
  const value = Number(decisionValue);
  const cost = Number(informationCost);
  const flip = Boolean(sensitivity?.recommendationFlip);
  const finiteInputs = finite(decisionValue) && finite(informationCost) && value >= 0 && cost >= 0;
  const expectedValue = finiteInputs && flip ? value : (finiteInputs ? 0 : null);
  return { schemaVersion: 'vidik.value-of-information.v1', recommendationFlip: flip, inputsComplete: finiteInputs, decisionValue: finiteInputs ? value : null, informationCost: finiteInputs ? cost : null, expectedValueOfInformation: expectedValue, netValueOfInformation: finiteInputs ? expectedValue - cost : null, actionable: finiteInputs && expectedValue > cost, unknownIsNotZero: !finiteInputs };
}

function buildLearningEnvelope({ artifactHash, observations = [] } = {}) {
  const valid = observations.filter(o => o && o.metric && finite(o.predicted) && finite(o.observed));
  const residuals = valid.map(o => ({ metric: o.metric, residual: Number(o.observed) - Number(o.predicted), months: finite(o.months) ? Number(o.months) : null }));
  return { schemaVersion: 'vidik.production-learning.v1', baselineArtifactHash: artifactHash || null, observations: residuals, observedCount: residuals.length, driftSignal: residuals.some(r => Math.abs(r.residual) > 0), attributionRequired: true, automaticParameterMutation: false, historyImmutable: true, learningHash: sha256({ artifactHash, residuals }) };
}

/**
 * Runs the canonical Decision Intelligence 9.7 analysis and the canonical
 * resource optimizer together. This is intentionally an integration gate,
 * not a second optimizer: production certification must consume the same
 * sensitivity/uncertainty/VOI and resource->capacity->activity->outcome
 * machinery used elsewhere in VIDIK.
 */
function validateCanonicalDecisionIntegration({ resourceEnvelope, interventionComparison = [], resourceModels = {}, baseline = {}, parameters = [], correlations = [], scoreFn, voiCandidates = [], decisionValue = 1, sensitivitySteps = 21, uncertaintySamples = 500, expectedOptimizerStatus = 'OPTIMIZED' } = {}) {
  const optimization = ResourceOptimization.evaluateResourceOptimization(resourceEnvelope, interventionComparison, resourceModels);
  let analysis = null;
  let analysisError = null;
  try {
    analysis = DecisionIntelligence.analyze({ baseline, parameters, correlations, scoreFn, candidates: voiCandidates, decisionValue, sensitivitySteps, uncertaintySamples });
  } catch (error) {
    analysisError = error.message;
  }
  const analysisValid = Boolean(analysis && analysis.version === DecisionIntelligence.VERSION && analysis.integrityHash && analysis.integrityHash.length === 64);
  const optimizerValid = optimization.status === expectedOptimizerStatus && Array.isArray(optimization.candidates);
  return {
    schemaVersion: 'vidik.canonical-decision-integration.v1',
    optimizer: optimization,
    decisionIntelligence: analysis,
    analysisError,
    optimizerValid,
    analysisValid,
    validated: optimizerValid && analysisValid,
    integrationHash: sha256({ optimization, analysis, analysisError })
  };
}

function certifyDecision({ run, selectedCandidateId = null, verifications = {}, targetJurisdiction = null, budget = null, decisionValue = null, informationCost = null, observations = [], tournament = null, canonicalIntegration = null } = {}) {
  const universe = auditInterventionUniverse({ problem: run?.problem, candidates: run?.candidates || [], sourceSearches: run?.acquisitionSources || run?.sourceSearches || [], statusQuo: run?.statusQuo });
  const evidenceLeads = Object.values(run?.evidenceDiscovery || {}).flatMap(item => item?.evidenceLeads || []).filter(Boolean);
  const evidence = auditEvidencePipeline({ candidates: run?.candidates || [], evidenceLeads, verifications, targetJurisdiction });
  const analysis = run?.analysis || Object.fromEntries((run?.candidates || []).map(c => [c.id, run?.analysisInputs?.[c.id] || {}]));
  const optimization = validateOptimization({ candidates: run?.candidates || [], allocations: run?.allocations || {}, budget, analysis });
  const sensitivity = buildSensitivityEnvelope({ candidates: run?.candidates || [], analysis });
  const voi = calculateVOI({ sensitivity, decisionValue, informationCost });
  const selectedArtifact = selectedCandidateId ? run?.governance?.decisionArtifacts?.[selectedCandidateId] : null;
  const artifactValidation = selectedArtifact ? Closure.validateDecisionArtifact(selectedArtifact) : { valid: false, reasons: ['selected-artifact-missing'] };
  const learning = buildLearningEnvelope({ artifactHash: selectedArtifact?.artifactHash || null, observations });
  const stages = {
    interventionUniverse: universe.candidatesConsidered > 0 && universe.recommendationBoundary !== 'violation' && universe.status === 'found' && universe.sourceFailures === 0,
    evidencePipeline: evidence.evidenceLeadCount > 0 && evidence.verifiedParameterCount > 0 && evidence.unsafeLeadCount === 0 && evidence.orphanVerificationCount === 0,
    quantitativeOptimization: optimization.validated,
    uncertaintySensitivityVOI: sensitivity.stable && voi.inputsComplete,
    decisionArtifact: artifactValidation.valid,
    outcomeLearning: learning.historyImmutable && learning.automaticParameterMutation === false,
    adversarialReadiness: Boolean(tournament?.passed === true)
  };
  if (canonicalIntegration) stages.canonicalIntegration = canonicalIntegration.validated === true;
  return { schemaVersion: 'vidik.production-intelligence-certification.v1', stages, complete: Object.values(stages).every(Boolean), blockers: Object.entries(stages).filter(([, ok]) => !ok).map(([id]) => id), universe, evidence, optimization, sensitivity, voi, artifactValidation, learning, canonicalIntegration, tournament: tournament || { passed: false, reason: 'tournament-not-supplied' }, certificationHash: sha256({ stages, universe, evidence, optimization, sensitivity, voi, artifactValidation, learning, canonicalIntegration, tournament }) };
}

function runAdversarialTournament({ scenarios = [] } = {}) {
  const results = [];
  for (const scenario of scenarios) {
    const candidates = Array.isArray(scenario.candidates) ? scenario.candidates : [];
    const found = Discovery.discoverInterventions({ problem: scenario.problem, candidates });
    const decoys = candidates.filter(c => c.decoy === true).map(c => c.id);
    const retainedDecoys = found.filter(c => decoys.includes(c.id)).map(c => c.id);
    const unrelatedLeak = found.filter(c => c.problemTags?.includes('unrelated')).map(c => c.id);
    results.push({ id: scenario.id || scenario.problem, candidatesSupplied: candidates.length, candidatesRetained: found.length, retainedIds: found.map(c => c.id), decoyLeakCount: retainedDecoys.length, unrelatedLeakCount: unrelatedLeak.length, emptyIsExplicit: found.length === 0, passed: retainedDecoys.length === 0 && unrelatedLeak.length === 0 });
  }
  return { schemaVersion: 'vidik.adversarial-tournament.v1', results, passed: results.length > 0 && results.every(r => r.passed), tournamentHash: sha256(results) };
}

module.exports = { auditInterventionUniverse, auditEvidencePipeline, validateOptimization, buildSensitivityEnvelope, calculateVOI, buildLearningEnvelope, validateCanonicalDecisionIntegration, certifyDecision, runAdversarialTournament, sha256 };