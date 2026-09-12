'use strict';

const assert = require('assert');
const { SOURCE_REGISTRY, sourceRegistry, validateRegistry } = require('../js/source-registry');

assert(SOURCE_REGISTRY.length >= 6, 'registry must contain core external discovery sources');
assert(validateRegistry().every(result => result.valid), 'every registry source must satisfy acquisition security contract');

const canadian = sourceRegistry({ domains: ['local-baseline'], jurisdiction: 'CA' });
assert(canadian.some(source => source.sourceId === 'ca-open-government'), 'Canadian open government source missing');

const crime = sourceRegistry({ domains: ['causal-evidence'], tags: ['violent-crime'] });
assert(crime.some(source => source.sourceId === 'campbell-crime-justice'), 'crime evidence discovery source missing');
assert(crime.some(source => source.sourceId === 'openalex-works'), 'research graph discovery source missing');

const ranked = sourceRegistry({ domains: ['causal-evidence'] });
for (let i = 1; i < ranked.length; i++) assert(ranked[i - 1].tierRank <= ranked[i].tierRank, 'sources must be ranked by governance tier');

console.log('source-registry.test.js: PASS');
