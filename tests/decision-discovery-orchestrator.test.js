'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { buildDiscoveryRun, comparableCityLeads } = require('../js/decision-discovery-orchestrator');

test('arbitrary problem records the complete discovery path without fabrication', () => {
  const run = buildDiscoveryRun({
    problem: 'reduce violent crime',
    acquisitionSources: [{ sourceId: 'municipal-programs', sourceType: 'local-program', status: 'searched', candidatesReturned: 2 }],
    localCandidates: [
      { id: 'violence-interruption', name: 'Violence interruption', problemTags: ['violent-crime'], domains: ['public-safety'], requiredEvidence: ['causal', 'implementation'] },
      { id: 'unrelated', name: 'Street beautification', problemTags: ['aesthetics'], domains: ['environment'], requiredEvidence: ['causal'] }
    ],
    researchLeads: [{ id: 'research-1', title: 'Community violence intervention', problemTags: ['violent-crime'], domains: ['public-safety'], evidenceStatus: 'potential' }],
    comparableCities: [{ city: 'Toronto', problem: 'violent crime', interventions: 'violence interruption' }]
  });

  assert.equal(run.discoveryAudit.problem, 'reduce violent crime');
  assert.ok(run.discoveryAudit.candidatesConsidered >= 2);
  assert.ok(run.discoveryAudit.candidatesMatched >= 1);
  assert.equal(run.governance.unknownIsNotZero, true);
  assert.equal(run.governance.effectsImportedFromComparableCities, false);
  assert.equal(typeof run.runHash, 'string');
  assert.equal(run.runHash.length, 64);
});

test('unseen problem produces an explicit searched no-candidate state', () => {
  const run = buildDiscoveryRun({
    problem: 'improve public library wait times',
    acquisitionSources: [
      { sourceId: 'municipal-programs', sourceType: 'local-program', status: 'searched', candidatesReturned: 0 },
      { sourceId: 'research-discovery', sourceType: 'research', status: 'searched', candidatesReturned: 0 }
    ]
  });

  assert.equal(run.candidates.length, 0);
  assert.equal(run.discoveryAudit.emptyResult, true);
  assert.equal(run.discoveryAudit.status, 'no-candidates-found');
  assert.equal(run.discoveryAudit.candidatesConsidered, 0);
  assert.equal(run.governance.noCandidatesFound, true);
  assert.equal(run.governance.recommendationAllowed, false);
});

test('comparable cities are leads, never effect imports', () => {
  const leads = comparableCityLeads({
    problem: 'reduce emergency department overcrowding',
    cities: [
      { city: 'Toronto', problem: 'emergency department overcrowding', interventions: 'community paramedicine' },
      { city: 'Melbourne', problem: 'emergency department overcrowding', interventions: 'hospital at home' },
      { city: 'Ottawa', problem: 'road safety', interventions: 'speed management' }
    ]
  });

  assert.deepEqual(leads.map(item => item.city).sort(), ['Melbourne', 'Toronto']);
  assert.ok(leads.every(item => item.leadOnly === true));
  assert.ok(leads.every(item => item.effectsImported === false));
});
