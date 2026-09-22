'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { executeDecisionDiscovery } = require('../js/decision-discovery-execution');

test('production discovery execution exposes universe intelligence and learning discovery', async () => {
  const result = await executeDecisionDiscovery({
    problem: 'reduce an unseen public safety problem',
    requiredSourceTypes: ['intervention-library'],
    statusQuo: { explicit: true, id: 'status-quo' },
    searchers: {
      'intervention-library': async () => ({
        sourceId: 'test-intervention-source', sourceType: 'intervention-library',
        candidates: [{ id: 'candidate-x', name: 'Community prevention program', problemTags: ['public-safety'], requiredEvidence: ['causal','implementation'], discoveryText: 'unseen public safety intervention' }]
      })
    },
    comparableCities: [{ city: 'Comparable City', jurisdiction: 'CA', problem: 'unseen public safety problem', interventions: ['Community prevention program'] }]
  });
  assert.ok(result.governance.candidateUniverseIntelligence);
  assert.equal(result.governance.learningEffectsImported, false);
  assert.equal(result.governance.learningDiscoveryLeadOnly, true);
  assert.ok(result.learningDiscovery);
  assert.equal(result.learningDiscovery.effectsImported, false);
  assert.ok(result.governance.candidateUniverseIntelligence.candidatesConsidered >= 1);
});
