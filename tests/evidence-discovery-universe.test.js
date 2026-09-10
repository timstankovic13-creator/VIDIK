'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { expandInterventionUniverse } = require('../scripts/evidence-discovery-universe');

test('evidence discovery expands rather than replaces the seed universe', () => {
  const result = expandInterventionUniverse(
    [{ name: 'Housing First', score: null }],
    { candidates: [{ name: 'Violence interruption', sourceRecordIds: ['r1'] }] },
  );
  assert.equal(result.length, 2);
  assert.equal(result[0].origin, 'seed-taxonomy');
  assert.equal(result[1].origin, 'evidence-discovered');
  assert.equal(result[1].admissibility, 'unverified');
});

test('duplicate discovered candidates cannot overwrite seeded governance', () => {
  const result = expandInterventionUniverse(
    [{ name: 'Housing First', admissibility: 'admissible' }],
    { candidates: [{ name: 'housing first', admissibility: 'admissible' }] },
  );
  assert.equal(result.length, 1);
  assert.equal(result[0].origin, 'seed-taxonomy');
  assert.equal(result[0].admissibility, 'admissible');
});
