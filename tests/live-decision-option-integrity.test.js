'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { deduplicateCandidates, normalizeLead } = require('../js/decision-discovery-orchestrator');

test('candidate identity deduplicates the same intervention across discovery channels', () => {
  const acquired = normalizeLead(
    { id: 'focused-deterrence-library', name: 'Focused Deterrence', problemTags: ['violent-crime'], domains: ['public-safety'], interventionFamily: ['public-safety'] },
    { sourceId: 'library', sourceType: 'intervention-library', jurisdiction: 'CA' }
  );
  const research = normalizeLead(
    { id: 'focused-deterrence-paper', name: 'Focused Deterrence', problemTags: ['gun-violence', 'repeat-violence'], domains: ['public-safety'], interventionFamily: ['public-safety'] },
    { sourceId: 'research', sourceType: 'research', jurisdiction: 'international' }
  );
  const result = deduplicateCandidates([acquired, research]);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Focused Deterrence');
  assert.deepEqual(new Set(result[0].problemTags), new Set(['violent-crime', 'gun-violence', 'repeat-violence']));
  assert.equal(result[0].discovery.provenance.length, 1, 'primary identity retains trusted provenance only');
});

test('candidate identity is stable across punctuation and source-specific IDs', () => {
  const a = normalizeLead({ id: 'city-focused-deterrence', name: 'Focused-Deterrence', problemTags: ['violent-crime'] }, { sourceId: 'city', sourceType: 'comparable-city', jurisdiction: 'CA', comparableCity: 'Toronto' });
  const b = normalizeLead({ id: 'library-focused-deterrence', name: 'Focused Deterrence', problemTags: ['gun-violence'] }, { sourceId: 'library', sourceType: 'intervention-library', jurisdiction: 'CA' });
  const result = deduplicateCandidates([a, b]);
  assert.equal(result.length, 1);
});
