'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { classifyCkanRecord, extractCkanInterventionLeads, deduplicateInterventionLeads, inferInterventionFamily, buildInterventionUniverseAssessment } = require('../js/source-driven-intervention-discovery');
const SOURCE = { sourceId: 'ca-program-discovery', jurisdiction: 'CA', domain: 'intervention-universe' };

test('intervention classification rejects relevant data while preserving implementable actions', () => {
  assert.equal(classifyCkanRecord({ title: 'Violent Crime Statistics Dataset', notes: 'Crime statistics' }).accepted, false);
  assert.equal(classifyCkanRecord({ title: 'Community Violence Prevention Program', notes: 'Outreach and prevention service' }).accepted, true);
});

test('intervention family inference exposes reusable intervention taxonomy', () => {
  assert.deepEqual(inferInterventionFamily('Protected bike lane infrastructure project'), ['mobility-safety','infrastructure']);
  assert.deepEqual(inferInterventionFamily('Housing First supportive housing service'), ['housing']);
});

test('duplicate candidates from multiple sources collapse without losing provenance', () => {
  const a = extractCkanInterventionLeads({ result: { results: [{ id: '1', title: 'Housing First Supportive Housing Program', notes: 'service' }] } }, SOURCE, 'homelessness')[0];
  const b = extractCkanInterventionLeads({ result: { results: [{ id: '2', title: 'Housing First supportive housing programme', notes: 'service' }] } }, { ...SOURCE, sourceId: 'ca-ontario-program-discovery' }, 'homelessness')[0];
  const deduped = deduplicateInterventionLeads([a, b]);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].sourceCount, 2);
  assert.deepEqual(new Set(deduped[0].sourceIds), new Set(['ca-program-discovery','ca-ontario-program-discovery']));
  assert.equal(deduped[0].discovery.leadOnly, true);
  assert.equal(deduped[0].discovery.effectsImported, false);
});

test('universe assessment distinguishes complete discovery from partial or total outage', () => {
  const complete = buildInterventionUniverseAssessment({ problem: 'food insecurity', jurisdiction: 'CA', requestedSourceCount: 2, sourceSearches: [{ status: 'candidates-found' }, { status: 'searched-empty' }], candidates: [{ id: '1', name: 'Food access program', canonicalName: 'food access program', interventionFamily: ['food-access'], requiredEvidence: ['causal'] }] });
  assert.equal(complete.discoveryComplete, true);
  assert.equal(complete.stoppingReason, 'candidate-universe-discovered');
  const partial = buildInterventionUniverseAssessment({ requestedSourceCount: 2, sourceSearches: [{ status: 'candidates-found' }, { status: 'search-failed' }], candidates: [{ id: '1', name: 'Food access program', canonicalName: 'food access program', interventionFamily: ['food-access'], requiredEvidence: ['causal'] }] });
  assert.equal(partial.discoveryComplete, false);
  assert.equal(partial.stoppingReason, 'partial-source-failure');
  const outage = buildInterventionUniverseAssessment({ requestedSourceCount: 2, sourceSearches: [{ status: 'search-failed' }, { status: 'search-failed' }], candidates: [] });
  assert.equal(outage.discoveryComplete, false);
  assert.equal(outage.stoppingReason, 'all-sources-failed');
  assert.equal(outage.recommendationEligible, false);
});

test('generic prevention language in informational records is not enough to create an intervention candidate', () => {
  const result = classifyCkanRecord({ title: 'Crime Prevention General Information', notes: 'Statistics and general prevention information' });
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'non-intervention-resource');
});
