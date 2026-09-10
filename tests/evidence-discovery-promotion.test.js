'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { inspectDiscovery, REQUIRED_FIELDS } = require('../scripts/evidence-discovery-promotion');

test('evidence promotion remains blocked for discovered-only records', () => {
  const result = inspectDiscovery({
    candidates: [{ name: 'new intervention', origin: 'literature-discovered' }],
    records: [{ id: 'r1', title: 'Evaluation', causalAdmissibility: 'unverified', transportability: 'unverified' }],
  });
  assert.equal(result.promotableRecordCount, 0);
  assert.equal(result.status, 'evidence-insufficient');
  assert.ok(result.gaps[0].missing.length >= REQUIRED_FIELDS.length);
});

test('fully verified evidence can cross the discovery boundary without creating a recommendation', () => {
  const record = {
    id: 'r2', causalAdmissibility: 'admissible', transportability: 'transportable',
    intervention: 'example', outcome: 'crime rate', population: 'city residents',
    comparator: 'status quo', effect: 'relative reduction', studyDesign: 'quasi-experimental',
    setting: 'municipal', timeHorizon: '12 months', resourceOrCost: 'staff hours',
    implementationConditions: 'defined',
  };
  const result = inspectDiscovery({ candidates: [{ name: 'example' }], records: [record] });
  assert.equal(result.promotableRecordCount, 1);
  assert.equal(result.status, 'causal-review-ready');
  assert.equal(result.recommendationReady, false);
});

test('partially complete records expose exact remaining gaps', () => {
  const result = inspectDiscovery({
    records: [{ id: 'r3', causalAdmissibility: 'admissible', transportability: 'unverified', intervention: 'x', outcome: 'y' }],
  });
  assert.equal(result.promotableRecordCount, 0);
  assert.deepEqual(result.gaps[0].missing, REQUIRED_FIELDS.slice(2));
  assert.equal(result.gaps[0].transportability, 'unverified');
});
