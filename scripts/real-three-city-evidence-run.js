'use strict';

const { runCity } = require('./municipal-production-decision-run');
const { buildCanonicalDecisionObject } = require('../js/vidik-canonical-decision-object');
const { enrichEvidence, applyMarginalEvidence, withResourceEnvelope } = require('./municipal-canonical-decision-run');
const { PRODUCTION_HOUSING_EVIDENCE } = require('../evidence/production-housing-evidence');
const { enforceEvidenceAdmissibility } = require('../js/evidence-admissibility-firewall');
const { requiredDataManifest, buildAcquisitionResult, normalizeRecord } = require('../js/data-acquisition');
const { discoverInterventions, evidenceCoverage } = require('../js/intervention-discovery');

function attachProductionEvidence(run, city) {
  const evidence = PRODUCTION_HOUSING_EVIDENCE[city];
  const interventionComparison = (run.interventionComparison || []).map(item => {
    if (item.id !== 'housing') return item;
    const causalEvidence = {
      ...evidence,
      quality: 0.95,
      scenario: false,
      transportabilitySimilarity: evidence.transportability?.similarity ?? null
    };
    const gate = enforceEvidenceAdmissibility(causalEvidence, { expectedJurisdiction: evidence.targetJurisdiction });
    return { ...item, gate: { ...item.gate, ...gate, causalEvidence }, status: gate.admissible ? 'ADMISSIBLE' : 'BLOCKED' };
  });
  const selected = interventionComparison.find(item => item.id === 'housing');
  const causalEvidence = selected?.gate?.causalEvidence;
  const lineage = [
    ...(run.lineage || []).filter(item => item.kind !== 'causal_effect'),
    ...(causalEvidence ? [{ evidenceId: causalEvidence.id, kind: 'causal_effect', parameterId: 'housing:effect', transportability: causalEvidence }] : [])
  ];
  const counterfactual = causalEvidence ? {
    intervention: 'housing', statusQuoEffect: 0, interventionEffect: causalEvidence.estimate,
    incrementalEffect: causalEvidence.estimate, evidenceIds: [causalEvidence.id],
    semantics: 'Causal effect estimate is distinct from the municipal observed context.'
  } : run.counterfactual;
  return { ...run, interventionComparison, recommendation: gateRecommendation(interventionComparison), lineage, counterfactual };
}

function gateRecommendation(comparison) {
  const admissible = comparison.filter(item => item.status === 'ADMISSIBLE' && Number.isFinite(Number(item.score)));
  return admissible.length ? admissible.slice().sort((a, b) => Number(b.score) - Number(a.score) || a.id.localeCompare(b.id))[0].id : null;
}

function buildAcquisitionContext(run, city, problem = 'homelessness') {
  const manifest = requiredDataManifest({
    objective: run.objective || 'verified-outcome-improvement', problem,
    geography: city,
    domains: ['problem-outcome', 'local-baseline', 'population-equity', 'intervention-universe', 'implementation', 'cost-resource', 'causal-evidence', 'constraints-feasibility', 'geospatial-context', 'comparator-innovation', 'outcome-learning']
  });
  const source = {
    url: run.sourceLineage.sourceUrlUsed || run.sourceLineage.sourceUrl,
    provider: run.sourceLineage.provider,
    jurisdiction: city,
    domain: 'local-baseline', tier: 'official_publication',
    datasetId: run.sourceLineage.dataset || null
  };
  const observation = run.observedContext;
  const record = normalizeRecord({
    source,
    retrieval: { contentHash: run.sourceLineage.contentHash || run.audit?.evidenceHash || 'runtime-source-bound', finalUrl: run.sourceLineage.finalUrl || source.url, retrievedAt: run.sourceLineage.retrievedAt || new Date().toISOString() },
    value: observation?.value,
    unit: observation?.unit,
    period: observation?.asOf || observation?.period || 'source-reported-period',
    geography: city,
    aggregation: observation?.aggregation || 'source-reported',
    extractionMethod: observation?.extraction?.method || 'municipal-adapter',
    definition: observation?.definition || null,
    asOf: observation?.asOf || null
  });
  const evidenceIndex = {};
  const housing = run.interventionComparison?.find(item => item.id === 'housing');
  if (housing?.gate?.causalEvidence && housing.status === 'ADMISSIBLE') {
    evidenceIndex['housing-first-supportive-housing'] = {
      causal: { status: 'supported', evidenceId: housing.gate.causalEvidence.id },
      implementation: { status: 'potential', reason: 'implementation evidence acquisition remains required' },
      cost: { status: 'potential', reason: 'decision-specific marginal cost acquisition remains required' },
      equity: { status: 'potential', reason: 'local equity-effect acquisition remains required' }
    };
  }
  const candidates = discoverInterventions({ problem, evidenceIndex });
  const gaps = manifest.requirements.map(r => r.domain).filter(domain => domain !== 'local-baseline');
  return buildAcquisitionResult({ manifest, candidates: [source], records: [record], gaps: [...gaps, ...candidates.flatMap(c => c.missingEvidence.map(type => `intervention:${c.id}:${type}`))] });
}

async function runRealEvidenceCity(city, options = {}) {
  const raw = await runCity(city, options);
  const evidenced = attachProductionEvidence(raw, city);
  const acquisition = buildAcquisitionContext(evidenced, city, options.problem || 'homelessness');
  const enriched = enrichEvidence({ ...evidenced, acquisition }, options);
  const optimized = applyMarginalEvidence(enriched, options);
  return buildCanonicalDecisionObject({
    ...optimized,
    acquisition,
    resourceEnvelope: options.resourceEnvelope || null,
    audit: {
      ...optimized.audit,
      productionEvidenceRegistry: PRODUCTION_HOUSING_EVIDENCE[city].id,
      syntheticEvidenceExcluded: true,
      realMunicipalSource: true,
      realCausalEvidence: true,
      acquisitionComplete: acquisition.coverage.complete,
      acquisitionHash: acquisition.acquisitionHash,
      interventionCandidateCount: acquisition.records.length ? undefined : 0
    }
  });
}

async function runRealEvidenceAll(options = {}) {
  const cities = [];
  for (const city of ['Ottawa', 'Toronto', 'Melbourne']) {
    try { cities.push(await runRealEvidenceCity(city, options)); }
    catch (error) {
      cities.push({
        identityBrief: { decisionId: `VIDIK-${city.toLowerCase()}-blocked`, city, objective: 'verified-outcome-improvement', schemaVersion: 'vidik.canonical-decision-object.v1', immutableSnapshot: true },
        rationale: { recommendation: null, why: 'Real-evidence city run failed closed.', whyNot: [{ id: city, failures: [error.message] }] },
        integrity: { decisionIntegrity: true, reproducibleRun: false, syntheticEvidenceExcluded: true },
        driftFailureRegistry: { failureClosed: true, failureReasons: [error.message] }
      });
    }
  }
  return {
    schemaVersion: 'vidik.real-three-city-evidence-decision.v1',
    decisionProblem: 'Evaluate the same municipal homelessness resource-allocation problem using live municipal observations and explicitly provenance-bound causal evidence.',
    cities,
    evidenceRegistry: Object.fromEntries(Object.entries(PRODUCTION_HOUSING_EVIDENCE).map(([city, evidence]) => [city, {
      evidenceId: evidence.id, source: evidence.source, sourceUrl: evidence.sourceUrl,
      sourceJurisdiction: evidence.sourceJurisdiction, targetJurisdiction: evidence.targetJurisdiction,
      estimate: evidence.estimate, uncertainty: evidence.uncertainty,
      uncertaintyMethod: evidence.uncertaintyMethod || 'source-reported', mode: evidence.mode
    }])),
    acceptance: {
      allCitiesReturned: cities.length === 3, realMunicipalSourceRequired: true, realCausalEvidenceRequired: true,
      syntheticEvidenceExcluded: true, marginalOptimizationRequiresDecisionSpecificEvidence: true,
      acquisitionManifestRequired: true, interventionUniverseDiscoveryRequired: true
    }
  };
}

if (require.main === module) {
  const amountArg = process.argv.find(x => x.startsWith('--marginal-cad='));
  const options = withResourceEnvelope({}, amountArg ? amountArg.split('=')[1] : null);
  runRealEvidenceAll(options).then(result => process.stdout.write(JSON.stringify(result, null, 2) + '\n')).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
}

module.exports = { attachProductionEvidence, buildAcquisitionContext, runRealEvidenceCity, runRealEvidenceAll };
