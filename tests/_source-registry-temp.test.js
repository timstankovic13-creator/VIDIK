'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const { SOURCE_REGISTRY, sourceRegistry, validateRegistry } = require('../js/source-registry');

test('all governed sources validate', () => {
  const results = validateRegistry();
  assert.equal(results.length, SOURCE_REGISTRY.length);
  assert.ok(results.every(result => result.valid), JSON.stringify(results));
});

test('intervention discovery registry is not restricted to the old problem vocabulary', () => {
  const sources = sourceRegistry({ domains: ['intervention-universe'] });
  assert.ok(sources.length >= 5);
  assert.ok(sources.some(source => source.sourceId === 'ca-ontario-program-discovery'));
  assert.ok(sources.some(source => source.sourceId === 'uk-open-data-program-discovery'));
  assert.ok(sources.some(source => source.sourceId === 'au-open-data-program-discovery'));
});
