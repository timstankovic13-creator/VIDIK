'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateMSE } = require('../js/rc4-minimum-sufficient-evidence');

// This is an evidence-status fixture, not fabricated outcome data. It encodes
// only fields established as publicly available during the RC4 acquisition pass.
const PUBLIC_RUN = {
  '006': {
    fieldsPresent: ['first-year calls', 'dispatched to ANCHOR', 'handled without police', 'expansion date']
  },
  '009': {
    fieldsPresent: ['Date', 'Location', 'AvgSpeed', 'Pct85th', 'PctCompliance', 'activation/deactivation', 'uptime', 'approach/intersection traffic', 'collision severity/site linkage']
  },
  '010': {
    fieldsPresent: ['intersection/date', 'violations', 'camera operating status', 'treatment history', 'approach/intersection traffic', 'collision severity/site linkage']
  },
  '014': {
    fieldsPresent: ['beds by site/date', 'occupancy', 'admissions', 'nights', 'exit destination']
  }
};

test('public-evidence run produces useful lower-level outputs without causal promotion', () => {
  const results = Object.entries(PUBLIC_RUN).map(([caseId, input]) => ({ caseId, result: evaluateMSE(caseId, input) }));
  const byCase = Object.fromEntries(results.map(x => [x.caseId, x.result]));

  assert.equal(byCase['006'].descriptiveReady, true);
  assert.equal(byCase['006'].decisionSupportReady, false);

  assert.equal(byCase['009'].descriptiveReady, true);
  assert.equal(byCase['009'].decisionSupportReady, true);
  assert.ok(byCase['009'].missingEffectEvidence.includes('concurrent interventions'));

  assert.equal(byCase['010'].descriptiveReady, true);
  assert.equal(byCase['010'].decisionSupportReady, true);
  assert.ok(byCase['010'].missingEffectEvidence.includes('concurrent interventions'));

  assert.equal(byCase['014'].descriptiveReady, true);
  assert.equal(byCase['014'].decisionSupportReady, true);
  assert.ok(byCase['014'].missingEffectEvidence.includes('marginal bed exposure'));
});

test('public evidence cannot by itself generate an effect, ROI, or recommendation', () => {
  for (const [caseId, input] of Object.entries(PUBLIC_RUN)) {
    const r = evaluateMSE(caseId, input);
    assert.equal(r.noRecommendationFromMSEAlone, true);
  }
});
