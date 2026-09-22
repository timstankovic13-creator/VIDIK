'use strict';
const assert = require('assert');
const { enforceEvidenceAdmissibility, validateEvidenceSet, transportabilitySimilarity } = require('../js/evidence-admissibility-firewall');
const { requestHumanOverride } = require('../js/governed-human-override');
const { compareMarginalEvidence } = require('../js/marginal-resource-evidence');
const { runCanonicalAll, runCanonicalCity } = require('../scripts/municipal-canonical-decision-run');
const { fetchText } = require('../scripts/municipal-production-decision-run');

const validEvidence = {
  id: 'e1', quality: 0.95, asOf: '2026-01-01', unit: 'absolute stable-housing probability difference',
  sourceJurisdiction: 'Canada', targetJurisdiction: 'Ottawa, Canada', sourceProfile: { problemDefinition: 'homelessness' }
};

async function main() {
  const quality = enforceEvidenceAdmissibility({ ...validEvidence, quality: 0.2 }, { expectedJurisdiction: 'CA', expectedUnit: validEvidence.unit });
  assert.strictEqual(quality.admissible, false);
  assert(quality.failures.includes('evidence-quality-below-threshold'));

  const stale = enforceEvidenceAdmissibility({ ...validEvidence, asOf: '2020-01-01' }, { expectedJurisdiction: 'CA', expectedUnit: validEvidence.unit, now: '2026-09-09T00:00:00Z' });
  assert.strictEqual(stale.admissible, false);
  assert(stale.failures.includes('evidence-stale'));

  const usd = enforceEvidenceAdmissibility({ ...validEvidence, unit: 'USD' }, { expectedJurisdiction: 'CA', expectedUnit: validEvidence.unit });
  assert.strictEqual(usd.admissible, false);
  assert(usd.failures.includes('evidence-unit-incompatible'));

  const duplicates = validateEvidenceSet([{ ...validEvidence }, { ...validEvidence }], { expectedJurisdiction: 'CA', expectedUnit: validEvidence.unit });
  assert.deepStrictEqual(duplicates.duplicateIds, ['e1']);
  assert.strictEqual(duplicates.valid, false);

  const callerOverride = enforceEvidenceAdmissibility({ ...validEvidence, admissible: true, sourceJurisdiction: 'Australia', targetJurisdiction: 'Melbourne, Australia', transportabilitySimilarity: 0.1 }, { expectedJurisdiction: 'AU', expectedUnit: validEvidence.unit });
  assert.strictEqual(callerOverride.admissible, false);

  assert(transportabilitySimilarity({ populationScale: 1, problemDefinition: 'a' }, { populationScale: 1, problemDefinition: 'a' }) > 0.99);
  assert(transportabilitySimilarity({ populationScale: 1, problemDefinition: 'a' }, { populationScale: 10, problemDefinition: 'b' }) < 0.6);

  let networkAttempts = 0;
  const retryFetch = async () => { networkAttempts += 1; if (networkAttempts < 3) throw new TypeError('fetch failed'); return { ok: true, status: 200, headers: { get() { return 'text/plain'; } }, async text() { return 'Ottawa municipal source'; } }; };
  const retried = await fetchText('https://www.ottawa.ca/en/family-and-social-services/housing-and-homelessness/plans-facts-and-data/point-time-count/enumeration-overview-and-results', retryFetch);
  assert.strictEqual(retried.text, 'Ottawa municipal source');
  assert.strictEqual(networkAttempts, 3, 'transient municipal network failures must be retried before failing closed');

  const marginal = compareMarginalEvidence([
    { intervention: 'housing', resourceUnit: 'CAD', resourceAmount: 1000, incrementalCapacity: 1, incrementalActivity: 1, incrementalOutcome: 0.2, unit: 'outcome', evidenceId: 'm1', provenance: 'source', uncertainty: { low: 0.1, high: 0.3 }, transportability: { admissible: true } },
    { intervention: 'ase', resourceUnit: 'CAD', resourceAmount: 1000, incrementalCapacity: 1, incrementalActivity: 1, incrementalOutcome: 0.1, unit: 'outcome', evidenceId: 'm2', provenance: 'source', uncertainty: { low: 0.05, high: 0.15 }, transportability: { admissible: true } }
  ]);
  assert.strictEqual(marginal.status, 'OPTIMIZED');
  assert.strictEqual(marginal.winner, 'housing');
  assert.strictEqual(compareMarginalEvidence([]).status, 'BLOCKED_MISSING_MARGINAL_EVIDENCE');

  const base = { decisionId: 'D1', recommendation: 'housing', audit: { evidenceHash: 'abc' } };
  const overridden = requestHumanOverride(base, { actorId: 'person-1', reason: 'Local legal constraint requires a different allocation.', toRecommendation: 'ase' }, { canOverride: true, role: 'authorized-decision-maker' });
  assert.strictEqual(overridden.recommendation, 'ase');
  assert.strictEqual(overridden.decisionState, 'RECOMMENDATION_OVERRIDDEN');
  assert(overridden.governanceOverridesAudit.humanOverride.originalEvidenceHash === 'abc');

  const Ottawa = await runCanonicalCity('Ottawa');
  assert.strictEqual(Ottawa.identityBrief?.city, 'Ottawa');
  assert(Ottawa.rationale && (Ottawa.rationale.recommendation === null || typeof Ottawa.rationale.recommendation === 'string'));
  assert(['OPTIMIZED', 'BLOCKED_MISSING_MARGINAL_EVIDENCE'].includes(Ottawa.resourceEnvelope?.optimizationStatus));

  const all = await runCanonicalAll();
  assert.strictEqual(all.cities.length, 3);
  assert.strictEqual(all.acceptance.partialFailureIsolation, true);
  assert.strictEqual(all.acceptance.evidenceFirewall, true);
  assert.strictEqual(all.acceptance.marginalOptimizationRequiresDecisionSpecificEvidence, true);

  console.log('PASS production-hardening-a-d');
}

main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
