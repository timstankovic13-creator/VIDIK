'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { executeFullCapacityDecision } = require('../js/decision-discovery-execution');
const { discoverSourceDrivenInterventions } = require('../js/source-driven-intervention-discovery');
const { discoverCandidateEvidence } = require('../js/source-driven-evidence-discovery');
const { runAll } = require('../scripts/municipal-production-decision-run');

const PERSONAS = [
  ['municipal planner', 'reduce homelessness', 'CA'],
  ['public safety director', 'reduce violent crime', 'CA'],
  ['public health director', 'reduce emergency department overcrowding', 'CA'],
  ['climate resilience lead', 'reduce extreme heat illness', 'US'],
  ['business developer', 'improve small business survival', 'US'],
  ['infrastructure manager', 'reduce construction permitting delays', 'CA'],
  ['research analyst', 'reduce food insecurity', 'UK'],
  ['enterprise strategy lead', 'reduce digital access gaps', 'AU'],
];

test('PRODUCT USAGE GAMUT: arbitrary real-world jobs reach the real discovery/evidence machinery', async () => {
  const results = [];
  for (const [persona, problem, jurisdiction] of PERSONAS) {
    const discovery = await discoverSourceDrivenInterventions({ problem, jurisdiction, rows: 10 });
    assert.equal(discovery.problem, problem);
    assert.ok(discovery.sourceSearches.length > 0, persona + ': no sources were attempted');
    assert.ok(discovery.discoveryHash, persona + ': missing discovery hash');

    if (discovery.candidates.length === 0) {
      assert.ok(
        discovery.sourceSearches.some(s => s.status === 'search-failed' || s.status === 'searched-empty'),
        persona + ': empty universe without an explicit source state'
      );
      results.push({ persona, problem, jurisdiction, candidates: 0, blocked: true });
      continue;
    }

    const candidate = discovery.candidates[0];
    const evidence = await discoverCandidateEvidence({ problem, candidate, rows: 5 });
    assert.equal(evidence.recommendationEligible, false);
    assert.equal(evidence.effectsImported, false);
    assert.ok(evidence.sourceSearches.length >= 2, persona + ': evidence search did not diversify');

    results.push({
      persona, problem, jurisdiction,
      candidates: discovery.candidates.length,
      evidenceLeads: evidence.evidenceLeads.length,
      blockedUntilValidated: true
    });
  }
  assert.equal(results.length, PERSONAS.length);
  assert.ok(results.some(r => r.persona === 'business developer'));
  console.log(JSON.stringify({ usageGamut: results }, null, 2));
});

test('PRODUCT USAGE GAMUT: a real municipal decision is executable from source through recommendation/block', async () => {
  const result = await runAll({
    outcome: { predicted: 0.42, observed: 0.40, checkpoint: '6-month', kind: 'usage-gamut' }
  });

  assert.deepEqual(result.acceptance, { Ottawa: true, Toronto: true, Melbourne: true });
  const ottawa = result.cities.find(x => x.city === 'Ottawa');
  const toronto = result.cities.find(x => x.city === 'Toronto');
  const melbourne = result.cities.find(x => x.city === 'Melbourne');

  assert.equal(ottawa.decisionState, 'RECOMMENDATION');
  assert.equal(ottawa.recommendation, 'housing');
  assert.equal(ottawa.learning.recalibration.application, 'EXPLICIT_PARAMETER_MAPPING');

  assert.equal(toronto.decisionState, 'RECOMMENDATION');
  assert.equal(toronto.recommendation, 'housing');
  assert.notEqual(toronto.sourceLineage.sourceUrl, ottawa.sourceLineage.sourceUrl);

  assert.equal(melbourne.decisionState, 'BLOCKED');
  assert.equal(melbourne.recommendation, null);
  assert.equal(melbourne.audit.failureClosed, true);

  console.log(JSON.stringify({
    municipalUsage: result.comparison,
    expectedBehaviour: 'recommend where admissible; block where evidence is not transportable'
  }, null, 2));
});

test('PRODUCT USAGE GAMUT: no-evidence user request fails closed rather than fabricating a business case', async () => {
  const result = await executeFullCapacityDecision({
    problem: 'reduce an invented municipal problem with no validated evidence',
    discoveryJurisdiction: 'CA',
    statusQuo: { explicit: true, id: 'status-quo', description: 'Continue current practice' },
    decisionContext: { jurisdiction: 'CA' },
    fetchImpl: async () => {
      throw new Error('simulated upstream outage');
    }
  });

  assert.equal(result.decision.recommendation, null);
  assert.equal(result.decision.recommendationAllowed, false);
  assert.equal(result.governance.recommendationAllowed, false);
  assert.equal(result.governance.learningEffectsImported, false);
  assert.ok(result.governance.decisionArtifacts);
  assert.ok(result.runHash);
});
