'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const Discovery = require('../js/intervention-discovery');
const Orchestrator = require('../js/decision-discovery-orchestrator');

test('source-driven relevance survives integrated candidate assembly', () => {
  const sourceDrivenLead = {
    id: 'source:intervention-library:violent-crime',
    name: 'Neighborhood Violence Prevention Partnership',
    problemTags: ['How should a municipality allocate $10M of new spending over three years to reduce violent crime?'],
    domains: ['public-safety'],
    discoveryText: 'Community violence intervention and outreach for people at elevated risk of violence.',
    requiredEvidence: ['causal', 'implementation', 'cost', 'equity'],
    discovery: {
      source: 'source-driven-intervention-discovery',
      sourceType: 'intervention-library',
      leadOnly: true,
      effectsImported: false,
      discoveryOnly: true,
      provenance: [{
        sourceId: 'source-driven-intervention-discovery',
        sourceType: 'intervention-library',
        evidenceStatus: 'potential'
      }]
    }
  };

  const normalized = Orchestrator.normalizeLead(sourceDrivenLead, {
    sourceId: 'source-driven-intervention-discovery',
    sourceType: 'intervention-library',
    jurisdiction: 'CA'
  });

  assert.equal(normalized.discovery.discoveryOnly, true);
  assert.equal(normalized.discoveryText, sourceDrivenLead.discoveryText);

  const matched = Discovery.discoverInterventions({
    problem: 'How should a municipality allocate $10M of new spending over three years to reduce violent crime?',
    candidates: [normalized]
  });

  assert.equal(matched.length, 1);
  assert.equal(matched[0].name, sourceDrivenLead.name);
  assert.equal(matched[0].discovery.sourceType, 'intervention-library');
  assert.equal(matched[0].discovery.discoveryOnly, true);
  assert.equal(matched[0].discovery.effectsImported, false);
});

test('generic intervention-library records still require ordinary relevance matching', () => {
  const unrelated = Orchestrator.normalizeLead({
    id: 'unrelated-record',
    name: 'Municipal Fleet Maintenance Scheduling',
    problemTags: ['fleet'],
    domains: ['infrastructure'],
    discovery: {
      source: 'ordinary-intervention-library',
      sourceType: 'intervention-library',
      discoveryOnly: false,
      leadOnly: true,
      effectsImported: false
    }
  }, {
    sourceId: 'ordinary-intervention-library',
    sourceType: 'intervention-library',
    jurisdiction: 'CA'
  });

  const matched = Discovery.discoverInterventions({
    problem: 'How should a municipality allocate $10M of new spending over three years to reduce violent crime?',
    candidates: [unrelated]
  });

  assert.equal(matched.length, 0);
});
