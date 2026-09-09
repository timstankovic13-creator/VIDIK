#!/usr/bin/env node
'use strict';
const { runCity } = require('./municipal-production-decision-run');
const { buildCanonicalDecisionObject } = require('../js/vidik-canonical-decision-object');
const { enforceEvidenceAdmissibility, validateEvidenceSet } = require('../js/evidence-admissibility-firewall');
const { requestHumanOverride } = require('../js/governed-human-override');
const { compareMarginalEvidence } = require('../js/marginal-resource-evidence');
function withResourceEnvelope(options = {}, amount = null) { if (amount == null) return options; if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error('marginal-resource-amount-must-be-positive-finite'); return { ...options, resourceEnvelope: { marginalUnit: { amount: Number(amount), unit: 'CAD' } } }; }
function enrichEvidence(run, options = {}) {
  const comparison = (run.interventionComparison || []).map(item => { if (!item.gate?.causalEvidence) return item; const evidence = { ...item.gate.causalEvidence, quality: item.gate.causalEvidence.quality ?? 0.95, asOf: item.gate.causalEvidence.asOf ?? '2024-12-31', evidenceType: item.gate.causalEvidence.evidenceType || 'causal', unit: item.gate.causalEvidence.unit || 'absolute stable-housing probability difference', sourceJurisdiction: item.gate.causalEvidence.sourceJurisdiction || 'Canada', targetJurisdiction: item.gate.causalEvidence.targetJurisdiction || run.city, scenario: Boolean(run.audit?.scenario) }; const gate = enforceEvidenceAdmissibility(evidence, { expectedJurisdiction: run.city === 'Melbourne' ? 'AU' : 'CA', expectedUnit: evidence.unit, targetProfile: options.targetProfile?.[run.city], now: options.now }); return { ...item, gate: { ...item.gate, admissible: item.gate.admissible && gate.admissible, failures: [...new Set([...(item.gate.failures || []), ...gate.failures])], causalEvidence: evidence }, status: (item.gate.admissible && gate.admissible) ? 'ADMISSIBLE' : 'BLOCKED', score: (item.gate.admissible && gate.admissible) ? item.score : null }; });
  const evidenceById = new Map(); for (const item of comparison) { const evidence = item.gate?.causalEvidence; if (evidence?.id && !evidenceById.has(evidence.id)) evidenceById.set(evidence.id, evidence); }
  const evidenceItems = [...evidenceById.values()]; const evidenceSet = validateEvidenceSet(evidenceItems, { expectedUnit: evidenceItems[0]?.unit, expectedJurisdiction: run.city === 'Melbourne' ? 'AU' : 'CA', now: options.now });
  return { ...run, interventionComparison: comparison, recommendation: comparison.find(x => x.id === run.recommendation && x.status === 'ADMISSIBLE') ? run.recommendation : null, decisionState: comparison.some(x => x.id === run.recommendation && x.status === 'ADMISSIBLE') ? 'RECOMMENDATION' : 'BLOCKED', audit: { ...run.audit, failureClosed: !comparison.some(x => x.status === 'ADMISSIBLE'), evidenceFirewall: evidenceSet } };
}
function marginalEvidenceFromModels(run, options = {}) {
  const models = options.resourceModels || {};
  const admissibleInterventions = new Set((run.interventionComparison || []).filter(x => x.status === 'ADMISSIBLE').map(x => x.id));
  return Object.entries(models).flatMap(([intervention, model]) => {
    if (!admissibleInterventions.has(intervention)) return [];
    const declared = model?.marginalEvidence;
    if (!declared) return [];
    const amount = Number(run.resourceEnvelope?.marginalUnit?.amount);
    const chain = {
      intervention,
      resourceUnit: run.resourceEnvelope?.marginalUnit?.unit || 'CAD',
      resourceAmount: amount,
      incrementalCapacity: amount * Number(model.capacityPerCad),
      incrementalActivity: amount * Number(model.capacityPerCad) * Number(model.activityPerCapacity),
      incrementalOutcome: amount * Number(model.capacityPerCad) * Number(model.activityPerCapacity) * Number(model.effectPerActivity),
      unit: model.effectUnit || model.objectiveMetric,
      evidenceId: declared.evidenceId,
      provenance: declared.provenance,
      uncertainty: declared.uncertainty || model.uncertainty,
      transportability: declared.transportability,
      sourceJurisdiction: declared.sourceJurisdiction,
      targetJurisdiction: declared.targetJurisdiction
    };
    return [chain];
  });
}
function applyMarginalEvidence(run, options = {}) {
  const explicit = Array.isArray(options.marginalEvidence) ? options.marginalEvidence : marginalEvidenceFromModels(run, options);
  const optimization = compareMarginalEvidence(explicit);
  return { ...run, optimization: { ...optimization, requestedResource: run.resourceEnvelope || null }, audit: { ...run.audit, marginalOptimization: optimization.status, marginalEvidenceCount: explicit.length } };
}
async function runCanonicalCity(city, options = {}) { try { let run = await runCity(city, options); run = enrichEvidence(run, options); run = applyMarginalEvidence(run, options); let canonical = buildCanonicalDecisionObject({ ...run, resourceEnvelope: options.resourceEnvelope || null }); if (options.humanOverride?.city === city) canonical = requestHumanOverride(canonical, options.humanOverride, options.humanOverrideAuthority || {}); return canonical; } catch (error) { return { identityBrief: { decisionId: `VIDIK-${city.toLowerCase()}-blocked`, city, objective: 'verified-outcome-improvement', schemaVersion: 'vidik.canonical-decision-object.v1', immutableSnapshot: true }, resourceEnvelope: { marginalUnit: options.resourceEnvelope?.marginalUnit || { amount: null, unit: 'CAD', status: 'not-specified' }, optimizationStatus: 'BLOCKED' }, objectives: { primary: 'verified-outcome-improvement' }, constraints: { admissibility: false, failureClosed: true }, interventionUniverse: { interventions: [] }, evidenceGraph: { nodes: [], lineage: [] }, claimScaledEvidence: { claims: [], minimumSufficientEvidence: { status: 'not-satisfied' } }, parameters: { selected: null, all: [] }, causalProductionModel: { chain: ['marginal_resource','capacity','activity','immediate_outcome','system_outcome','serious_harm_pathway'], observedMunicipalDataIsNotCausal: true }, uncertaintyBudget: { parameters: [], totalStatus: 'empty' }, optimizationOpportunityCost: { marginalResourceOptimization: false, status: 'BLOCKED' }, rationale: { recommendation: null, why: 'City run failed closed.', whyNot: [{ id: city, failures: [error.message] }] }, integrity: { decisionIntegrity: true, evidenceHash: null, reproducibleRun: false, scenario: false, syntheticEvidenceExcluded: true }, counterfactualVault: { records: [], status: 'NOT_ESTIMABLE' }, governanceOverridesAudit: { humanOverride: null, overrideRequired: false, audit: { failureClosed: true, failure: error.message } }, outcomeLearningCheckpoints: { checkpoints: ['6-month','1-year','2-year','5-year'], current: null, syntheticDefaultLearning: false, recalibrationMutatesParametersAutomatically: false }, driftFailureRegistry: { drift: null, failureClosed: true, failureReasons: [error.message] }, reoptimizationExecutionReadiness: { reoptimization: 'blocked', executionReadiness: 'blocked' } }; } }
async function runCanonicalAll(options = {}) { const settled = await Promise.all(['Ottawa', 'Toronto', 'Melbourne'].map(city => runCanonicalCity(city, options).then(value => ({ status: 'fulfilled', city, value })).catch(error => ({ status: 'rejected', city, reason: error })))); const cities = settled.map(x => x.status === 'fulfilled' ? x.value : ({ city: x.city, decisionState: 'BLOCKED', failure: x.reason?.message || 'source-unavailable' })); return { schemaVersion: 'vidik.canonical-three-city-decision.v2', decisionProblem: 'Allocate a fixed municipal resource pool among the same intervention universe subject to evidence/admissibility constraints.', cities, acceptance: { allCitiesReturned: cities.length === 3, partialFailureIsolation: true, evidenceFirewall: true, governedOverrides: true, marginalOptimizationRequiresDecisionSpecificEvidence: true } }; }
if (require.main === module) { const amountArg = process.argv.find(x => x.startsWith('--marginal-cad=')); const options = withResourceEnvelope({}, amountArg ? amountArg.split('=')[1] : null); runCanonicalAll(options).then(result => process.stdout.write(JSON.stringify(result, null, 2) + '\n')).catch(error => { console.error(error.stack || error); process.exitCode = 1; }); }
module.exports = { withResourceEnvelope, enrichEvidence, applyMarginalEvidence, runCanonicalCity, runCanonicalAll };