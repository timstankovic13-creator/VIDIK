'use strict';

const assert = require('node:assert/strict');
const { canonicalCandidate, discoverOpenWorldInterventions, acquireEvidenceForCandidates, buildVerifiedParameters } = require('../js/vidik-open-world-intelligence');
const { executeProductionDecision } = require('../js/vidik-production-closed-loop');

const candidate = { id: 'candidate-1', name: 'Candidate 1', domains: ['municipal'], problemTags: ['test'], requiredEvidence: ['causal', 'implementation', 'cost', 'equity'], provenance: [{ source: 'catalogue', externalId: 'c1' }] };
const discoverySource = { id: 'source-1', async search() { return [candidate]; } };
const evidenceSource = { id: 'evidence-1', async search({ candidate: c }) { return [{ id: `lead-${c.id}`, candidateId: c.id, provenance: { externalId: `study-${c.id}` }, evidenceLeadOnly: true, causalEffectImported: false, evidenceType: 'causal' }]; } };
const verification = { verificationId: 'v1', verified: true, sourceId: 'evidence-1', externalId: 'study-candidate-1', evidenceType: 'causal', targetJurisdiction: 'TEST', sourceJurisdiction: 'TEST', transportability: { admissible: true }, localEvidenceBoundary: 'explicit', verifiedEvidence: ['causal', 'implementation', 'cost', 'equity'], parameter: { estimate: 2, unit: 'outcome/CAD', uncertainty: { low: 1, high: 3 } } };

async function main() {
  assert.throws(() => canonicalCandidate({ ...candidate, metadata: { estimate: 2 } }, 'source-1'), /discovery-effect-leak/);
  assert.throws(() => canonicalCandidate({ ...candidate, provenance: [] }, 'source-1'), /candidate-provenance-missing/);

  const noSources = await discoverOpenWorldInterventions({ problem: 'arbitrary problem' });
  assert.equal(noSources.complete, false);
  assert.equal(noSources.failureState, 'no-discovery-sources');

  const acquired = await acquireEvidenceForCandidates({ candidates: [candidate], evidenceSources: [evidenceSource], targetJurisdiction: 'TEST' });
  assert.equal(acquired.complete, true);
  const verified = buildVerifiedParameters({ candidates: [candidate], evidenceLeads: acquired.evidenceLeads, verifications: {}, targetJurisdiction: 'TEST' });
  assert.equal(verified.complete, false);
  assert.deepEqual(verified.missingCandidates, ['candidate-1']);

  const blocked = await executeProductionDecision({ problem: 'arbitrary problem', objective: 'reduce harm', discoverySources: [discoverySource], evidenceSources: [evidenceSource], verifications: {}, targetJurisdiction: 'TEST', resourceEnvelope: { marginalUnit: { amount: 100, unit: 'CAD' } }, objectiveMetric: 'outcome/CAD', statusQuo: { explicit: true, expectedOutcome: 10 } });
  assert.equal(blocked.status, 'BLOCKED');
  assert.ok(blocked.reasons.includes('independent-verification-incomplete'));

  const noStatusQuo = await executeProductionDecision({ problem: 'arbitrary problem', objective: 'reduce harm', discoverySources: [discoverySource], evidenceSources: [evidenceSource], verifications: { 'lead-candidate-1': verification }, targetJurisdiction: 'TEST', resourceEnvelope: { marginalUnit: { amount: 100, unit: 'CAD' } }, objectiveMetric: 'outcome/CAD' });
  assert.equal(noStatusQuo.status, 'BLOCKED');
  assert.ok(noStatusQuo.reasons.includes('status-quo-required-and-must-be-quantified'));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
