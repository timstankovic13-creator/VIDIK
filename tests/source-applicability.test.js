'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { assessInterventionSourceApplicability } = require('../js/intervention-source-applicability');

test('arbitrary unseen problem never becomes an unsearched source universe', () => {
  const result = assessInterventionSourceApplicability({ problem: 'reduce quasar instability' });
  assert.equal(result.noApplicableSource, false);
  assert.equal(result.fallbackApplied, true);
  assert.ok(result.sourcesSelected.length > 0);
  assert.equal(result.searchRequired, true);
  assert.ok(result.sourcesConsidered.length >= result.sourcesSelected.length);
});

test('jurisdiction filtering remains explicit and auditable', () => {
  const result = assessInterventionSourceApplicability({ problem: 'unexpected emerging municipal problem', jurisdiction: 'Canada' });
  assert.equal(result.fallbackApplied, false);
  assert.ok(result.sourcesSelected.includes('ca-program-discovery'));
  assert.ok(result.decisions.some(item => item.reason === 'jurisdiction-mismatch'));
  assert.ok(result.sourcesSelected.every(id => result.decisions.find(item => item.sourceId === id)?.selected));
});

test('country names and country codes select the matching national catalogue', () => {
  const cases = [
    { aliases: ['Canada', 'canada', 'CA'], expected: 'ca-program-discovery', excluded: 'uk-gov-program-discovery' },
    { aliases: ['United States', 'United States of America', 'USA', 'US'], expected: 'us-open-data-program-discovery', excluded: 'uk-gov-program-discovery' },
    { aliases: ['United Kingdom', 'Great Britain', 'Britain', 'UK'], expected: 'uk-open-data-program-discovery', excluded: 'ca-program-discovery' },
    { aliases: ['Australia', 'AU'], expected: 'au-open-data-program-discovery', excluded: 'uk-gov-program-discovery' },
    { aliases: ['New Zealand', 'NZ'], expected: 'nz-open-data-program-discovery', excluded: 'uk-gov-program-discovery' },
    { aliases: ['Ireland', 'IE'], expected: 'ie-open-data-program-discovery', excluded: 'uk-gov-program-discovery' }
  ];

  for (const { aliases, expected, excluded } of cases) {
    for (const jurisdiction of aliases) {
      const result = assessInterventionSourceApplicability({ problem: 'reduce invoice processing time', jurisdiction });
      assert.ok(result.sourcesSelected.includes(expected), jurisdiction + ': expected national catalogue missing');
      assert.ok(!result.sourcesSelected.includes(excluded), jurisdiction + ': unrelated national catalogue selected');
    }
  }
});

test('empty problem is rejected rather than silently searching broadly', () => {
  assert.throws(() => assessInterventionSourceApplicability({ problem: '   ' }), /source-applicability-problem-required/);
});
