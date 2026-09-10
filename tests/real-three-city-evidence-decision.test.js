'use strict';

const assert = require('assert');
const { CANONICAL_18 } = require('../js/vidik-architecture-contract');
const { runRealEvidenceAll } = require('../scripts/real-three-city-evidence-run');
const { PRODUCTION_HOUSING_EVIDENCE } = require('../evidence/production-housing-evidence');

(async () => {
  const result = await runRealEvidenceAll();
  assert.strictEqual(result.cities.length, 3);
  assert.strictEqual(result.acceptance.realMunicipalSourceRequired, true);
  assert.strictEqual(result.acceptance.realCausalEvidenceRequired, true);
  assert.strictEqual(result.acceptance.syntheticEvidenceExcluded, true);

  const byCity = Object.fromEntries(result.cities.map(x => [x.identityBrief.city, x]));
  for (const city of ['Ottawa', 'Toronto', 'Melbourne']) {
    const decision = byCity[city];
    if (decision.rationale?.recommendation !== 'housing') {
      console.error(`${city} real-evidence decision failed closed:`, JSON.stringify(decision.driftFailureRegistry || decision.rationale || {}, null, 2));
    }
    assert.strictEqual(Object.keys(decision).length, CANONICAL_18.length, `${city}: canonical 18-part object required`);
    assert.strictEqual(decision.identityBrief.immutableSnapshot, true);
    assert.strictEqual(decision.integrity.decisionIntegrity, true);
    assert.strictEqual(decision.integrity.syntheticEvidenceExcluded, true);
    assert.strictEqual(decision.causalProductionModel.observedMunicipalDataIsNotCausal, true);
    assert.strictEqual(decision.rationale.recommendation, 'housing');
    const municipalNode = decision.evidenceGraph.nodes.find(node => node.id === `municipal:${city}`);
    assert.ok(municipalNode, `${city}: municipal evidence node missing`);
    assert.ok(municipalNode.provenance?.sourceUrlUsed, `${city}: live municipal source provenance missing`);
    assert.ok(decision.evidenceGraph.nodes.some(node => node.kind === 'causal_effect'), `${city}: causal evidence node missing`);
    assert.ok(decision.evidenceGraph.lineage.some(x => x.kind === 'causal_effect'), `${city}: causal evidence lineage missing`);
    assert.ok(decision.parameters.selected?.evidenceIds?.length >= 1, `${city}: selected evidence lineage missing`);
    assert.ok(decision.uncertaintyBudget.parameters.length >= 1, `${city}: uncertainty budget missing`);
    assert.strictEqual(decision.counterfactualVault.status, 'RECORDED');
    assert.strictEqual(decision.governanceOverridesAudit.audit.syntheticEvidenceExcluded, true);
    assert.strictEqual(decision.governanceOverridesAudit.audit.realMunicipalSource, true);
    assert.strictEqual(decision.governanceOverridesAudit.audit.realCausalEvidence, true);
  }

  assert.strictEqual(byCity.Ottawa.optimizationOpportunityCost.status, 'BLOCKED_MISSING_MARGINAL_EVIDENCE');
  assert.strictEqual(byCity.Toronto.optimizationOpportunityCost.status, 'BLOCKED_MISSING_MARGINAL_EVIDENCE');
  assert.strictEqual(byCity.Melbourne.optimizationOpportunityCost.status, 'BLOCKED_MISSING_MARGINAL_EVIDENCE');
  assert.strictEqual(result.evidenceRegistry.Ottawa.mode, 'transported');
  assert.strictEqual(result.evidenceRegistry.Toronto.mode, 'site-supported');
  assert.strictEqual(result.evidenceRegistry.Melbourne.mode, 'site-supported');
  assert.strictEqual(result.evidenceRegistry.Melbourne.estimate, PRODUCTION_HOUSING_EVIDENCE.Melbourne.estimate, 'Melbourne estimate must match the independently reconstructed production evidence value');

  console.log('VIDIK real three-city evidence decision validation: PASS');
  console.log('Ottawa=Housing First recommendation using transported Canadian RCT evidence');
  console.log('Toronto=Housing First recommendation using Toronto-supported Canadian RCT evidence');
  console.log('Melbourne=Housing/support recommendation using Melbourne J2SI randomized evidence');
  console.log('Marginal optimization remains BLOCKED until defensible decision-specific marginal resource evidence is supplied.');
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
