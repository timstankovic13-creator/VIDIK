'use strict';
const assert = require('assert');
const { buildCanonicalDecisionObject } = require('../js/vidik-canonical-decision-object');

const run = {
  city: 'Ottawa',
  objective: 'verified-outcome-improvement',
  decisionId: 'VIDIK-test-001',
  recommendation: 'housing',
  interventionComparison: [
    { id: 'housing', name: 'Housing First / supportive housing', status: 'ADMISSIBLE', score: .3276, risk: .22, gate: { causalEvidence: { id: 'housing-rct', estimate: .42, unit: 'absolute stable-housing probability difference', uncertainty: { low: .36, high: .48 }, mode: 'transported' } } },
    { id: 'ase', name: 'Automated speed enforcement / speed management', status: 'BLOCKED', score: null, risk: .28, gate: { failures: ['city-specific-ase-admissibility-evidence-missing'] } }
  ],
  sourceLineage: { sourceUrl: 'https://www.ottawa.ca/example' },
  lineage: [{ evidenceId: 'housing-rct', parameterId: 'housing:effect' }],
  counterfactual: { intervention: 'housing', incrementalEffect: .42 },
  audit: { failureClosed: false, evidenceHash: 'abc', blockedAlternatives: [{ id: 'ase' }] },
  optimization: { status: 'BLOCKED' },
  learning: null
};
const object = buildCanonicalDecisionObject(run);
assert.ok(object.uncertaintyBudget.decisionIntelligence);
assert.strictEqual(object.uncertaintyBudget.decisionIntelligence.version, '9.7.1');
assert.ok(object.integrity.decisionIntelligenceHash);
assert.ok(object.parameters.all[0].uncertainty);
assert.ok(Array.isArray(object.uncertaintyBudget.decisionIntelligence.recommendationFlips));
console.log('canonical-decision-intelligence: PASS');
