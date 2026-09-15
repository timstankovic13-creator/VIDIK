'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { executeDecisionDiscovery } = require('../js/decision-discovery-execution');

const CASES = [
  {
    problem: 'reduce pedestrian deaths',
    jurisdiction: 'CA',
    candidates: [
      { id: 'street-redesign', name: 'Protected intersection redesign', problemTags: ['pedestrian-safety'], requiredEvidence: ['causal', 'implementation'], discoveryText: 'Intersection redesign intervention.' },
      { id: 'speed-management', name: 'Targeted speed management', problemTags: ['pedestrian-safety'], requiredEvidence: ['causal', 'implementation'], discoveryText: 'Speed management intervention.' },
      { id: 'dashboard', name: 'Pedestrian injury dashboard', problemTags: ['pedestrian-safety'], requiredEvidence: ['causal'], discoveryText: 'Administrative statistics dashboard.' }
    ]
  },
  {
    problem: 'reduce extreme heat illness',
    jurisdiction: 'UK',
    candidates: [
      { id: 'cooling-centres', name: 'Cooling centre service', problemTags: ['extreme-heat'], requiredEvidence: ['causal', 'implementation'], discoveryText: 'Heat-response service.' },
      { id: 'cool-roofs', name: 'Cool-roof retrofit grants', problemTags: ['extreme-heat'], requiredEvidence: ['causal', 'implementation'], discoveryText: 'Heat mitigation retrofit intervention.' },
      { id: 'heat-report', name: 'Heat statistics report', problemTags: ['extreme-heat'], requiredEvidence: ['causal'], discoveryText: 'Administrative statistics report.' }
    ]
  }
];

function evidenceFor(candidate) {
  return {
    candidateId: candidate.id,
    evidenceComplete: false,
    effectsImported: false,
    sourceSearches: [
      { sourceId: 'openalex', status: 'evidence-leads-found' },
      { sourceId: 'pubmed', status: 'evidence-leads-found' }
    ],
    evidenceLeads: [
      {
        id: `${candidate.id}-evidence-lead`,
        evidenceLeadOnly: true,
        causalEffectImported: false,
        provenance: { sourceId: 'openalex', jurisdiction: null }
      }
    ]
  };
}

for (const scenario of CASES) {
  test(`blind end-to-end decision tournament: ${scenario.jurisdiction} / ${scenario.problem}`, async () => {
    const result = await executeDecisionDiscovery({
      problem: scenario.problem,
      discoveryJurisdiction: scenario.jurisdiction,
      requiredSourceTypes: ['intervention-library'],
      statusQuo: { explicit: true, id: 'status-quo', description: 'Continue current practice' },
      comparableCities: [
        { city: 'Comparable City', jurisdiction: scenario.jurisdiction, problem: scenario.problem, interventions: ['comparable lead'] }
      ],
      searchers: {
        'intervention-library': async () => ({
          sourceId: `blind-${scenario.jurisdiction.toLowerCase()}-interventions`,
          sourceType: 'intervention-library',
          jurisdiction: scenario.jurisdiction,
          status: 'candidates-found',
          candidates: scenario.candidates
        })
      },
      evidenceSearcher: async ({ candidate }) => evidenceFor(candidate),
      decisionContext: { outcomeObservations: [] }
    });

    // Problem -> universe: multiple leads survive discovery, while the engine retains governance metadata.
    assert.equal(result.problem, scenario.problem);
    assert.equal(result.candidates.length, 3);
    assert.ok(result.governance.candidateUniverseIntelligence);
    assert.ok(result.governance.candidateUniverseIntelligence.candidatesConsidered >= 3);
    assert.ok(result.governance.discoveryStrategyHash);

    // Evidence: candidate-specific searches are diversified, but lead-only evidence cannot become effects.
    assert.equal(result.evidenceSearches.length, 3);
    assert.ok(result.evidenceSearches.every(search => search.status !== 'search-failed'));
    assert.ok(result.evidenceDiscovery.length === 3);
    assert.ok(result.evidenceDiscovery.every(item => item.effectsImported === false));

    // Decision boundary: insufficient causal qualification blocks recommendation rather than inventing one.
    assert.equal(result.governance.recommendationAllowed, false);
    assert.equal(result.decision.recommendationAllowed, false);
    assert.equal(result.decision.recommendation, null);
    assert.equal(result.decision.status, 'recommendation-blocked');

    // Why / Why-not and audit closure still exist even when the correct outcome is refusal.
    assert.equal(result.governance.whyNotAvailable, true);
    assert.ok(result.nextPhase.whyWhyNot);
    assert.equal(result.governance.counterfactualRequired, true);
    assert.equal(Object.keys(result.governance.decisionArtifacts).length, 3);
    assert.ok(Object.values(result.governance.decisionArtifacts).every(artifact => artifact.validation.valid === true));
    assert.ok(result.governance.reviewPlan);
    assert.ok(result.governance.outcomeClosure);

    // Learning/comparator intelligence remains discovery-only and cannot import effects.
    assert.equal(result.governance.learningEffectsImported, false);
    assert.equal(result.governance.learningDiscoveryLeadOnly, true);
    assert.ok(result.learningDiscovery);
    assert.equal(result.intelligence.governance.comparableEffectsImported, false);
  });
}
