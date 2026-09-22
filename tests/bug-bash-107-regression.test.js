'use strict';
const assert = require('assert');
const { isPrivateHost, validateRecord } = require('../js/data-acquisition');
const { mergeInterventionCandidates } = require('../js/intervention-evidence-extractor');

assert.strictEqual(isPrivateHost('127.0.0.1'), true);
assert.strictEqual(isPrivateHost('::1'), true);
assert.strictEqual(isPrivateHost('::ffff:127.0.0.1'), true);
assert.strictEqual(isPrivateHost('fc00::1'), true);
assert.strictEqual(isPrivateHost('fe80::1'), true);
assert.strictEqual(isPrivateHost('8.8.8.8'), false);

const base = { source:{contentHash:'hash',url:'https://example.test/data'}, provider:'Test', domain:'local-baseline', unit:'people', period:'2026', geography:'Ottawa', aggregation:'point-in-time', value:10 };
assert.strictEqual(validateRecord({...base,asOf:'2027-01-01'},{now:new Date('2026-09-13T00:00:00Z')}).valid, false);
assert(validateRecord({...base,asOf:'2027-01-01'},{now:new Date('2026-09-13T00:00:00Z')}).failures.includes('future-as-of-date'));
assert(validateRecord({...base,asOf:'not-a-date'},{now:new Date('2026-09-13T00:00:00Z')}).failures.includes('invalid-as-of-date'));
assert(validateRecord({...base,asOf:'2026-01-01'},{now:new Date('2026-09-13T00:00:00Z'),maxAgeDays:30}).failures.includes('stale-source'));

const a = { id:'shared-program', name:'Shared program', domains:['health'], problemTags:['overcrowding'], requiredEvidence:['causal'], discovery:{source:'acquired-intervention-universe',sourceUrl:'https://one.test',datasetId:'one',discoveryQuery:'first query'} };
const b = { id:'shared-program', name:'Shared program', domains:['health'], problemTags:['emergency-response'], requiredEvidence:['cost'], discovery:{source:'acquired-intervention-universe',sourceUrl:'https://two.test',datasetId:'two',discoveryQuery:'second query'} };
const merged = mergeInterventionCandidates([a],[b])[0];
assert.deepStrictEqual(merged.domains.sort(), ['health']);
assert.deepStrictEqual(merged.problemTags.sort(), ['emergency-response','overcrowding']);
assert.deepStrictEqual(merged.requiredEvidence.sort(), ['causal','cost']);
assert.strictEqual(merged.discovery.sources.length, 2);
assert(merged.discovery.sources.some(source => source.discoveryQuery === 'first query'));
assert(merged.discovery.sources.some(source => source.discoveryQuery === 'second query'));

console.log('bug-bash-107 regressions passed');
