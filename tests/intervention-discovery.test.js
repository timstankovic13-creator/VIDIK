'use strict';
const assert = require('assert');
const Discovery = require('../js/intervention-discovery');
const Extractor = require('../js/intervention-evidence-extractor');

const crime = Discovery.discoverInterventions({ problem: 'Reduce violent crime' });
assert.ok(crime.length >= 4, 'violent crime must produce a candidate universe, not an empty refusal');
assert.ok(crime.some(candidate => candidate.id === 'violence-interruption'));
assert.ok(crime.some(candidate => candidate.id === 'focused-deterrence'));
assert.ok(crime.some(candidate => candidate.id === 'place-based-vacant-lot-intervention'));
assert.ok(crime.every(candidate => candidate.evidenceState === 'evidence-gap'), 'discovery must not manufacture evidence');

const acquired = Discovery.discoverInterventions({
  problem: 'Reduce violent crime',
  acquiredCandidates: [{
    id: 'acquired-community-violence-prevention',
    name: 'Community violence prevention',
    domains: ['public-safety'],
    problemTags: ['violent-crime'],
    requiredEvidence: ['causal', 'implementation'],
    discovery: { source: 'acquired-intervention-universe', sourceUrl: 'https://example.gov/interventions.json' }
  }]
});
assert.ok(acquired.some(candidate => candidate.id === 'acquired-community-violence-prevention'), 'acquired intervention candidates must enter the universe');
assert.strictEqual(acquired.find(candidate => candidate.id === 'acquired-community-violence-prevention').evidenceState, 'evidence-gap');

const supported = Discovery.discoverInterventions({
  problem: 'homelessness',
  evidenceIndex: {
    'housing-first-supportive-housing': {
      causal: { status: 'verified' }, implementation: { status: 'supported' }, cost: { status: 'supported' }, equity: { status: 'supported' }
    }
  }
});
const housingFirst = supported.find(candidate => candidate.id === 'housing-first-supportive-housing');
assert.strictEqual(housingFirst.evidenceState, 'evidence-complete');
assert.deepStrictEqual(housingFirst.missingEvidence, []);
assert.strictEqual(Discovery.evidenceCoverage(supported).total, supported.length);
assert.ok(Discovery.hashCandidateUniverse(supported).length === 64);

const ckan = Extractor.extractInterventionCandidates({
  result: { results: [{ id: 'program-1', title: 'Youth employment program', tags: ['violent-crime', 'employment'], category: 'employment', type: 'program' }] }
}, { sourceId: 'ca-program-discovery', url: 'https://example.gov/catalog', domain: 'intervention-universe' });
assert.strictEqual(ckan.length, 1, 'CKAN-style catalog results must be discoverable');
assert.strictEqual(ckan[0].id, 'program-1');
assert.ok(ckan[0].problemTags.includes('violent-crime'));
assert.ok(ckan[0].discovery.discoverySignals.includes('source-declared-intervention-universe'));

const arcgis = Extractor.extractInterventionCandidates({
  features: [{ attributes: { OBJECTID: 7, id: 'service-7', name: 'Mobile crisis response', problemTags: 'mental-health-crisis,ems-demand', domains: 'health,public-safety', type: 'service' } }]
}, { sourceId: 'arcgis-service-inventory', domain: 'intervention-universe' });
assert.strictEqual(arcgis[0].id, 'service-7');
assert.ok(arcgis[0].domains.includes('public-safety'));

const generic = Extractor.extractInterventionCandidatesDetailed({
  records: [{ id: 'row-1', name: 'Population count', value: 1200 }]
}, { sourceId: 'generic-statistical-dataset', domain: 'local-baseline' });
assert.strictEqual(generic.candidates.length, 0, 'generic records must not become interventions from id + name alone');
assert.strictEqual(generic.rejections[0].reason, 'missing-intervention-semantic');

const described = Extractor.extractInterventionCandidates({
  records: [{ id: 'program-2', name: 'Community cooling centre', description: 'A municipal service providing cooling space during extreme heat.' }]
}, { sourceId: 'municipal-programs', domain: 'program-discovery' });
assert.strictEqual(described.length, 1, 'described programs should be admitted even without an explicit type');
assert.ok(described[0].discovery.discoverySignals.includes('intervention-description'));

const portable = Discovery.discoverInterventions({
  problem: 'reduce emergency department overcrowding',
  acquiredCandidates: [{
    id: 'acquired-community-paramedicine',
    name: 'Community paramedicine service',
    discoveryText: 'A service reducing emergency department use and overcrowding',
    problemTags: [],
    domains: ['health'],
    requiredEvidence: ['causal']
  }]
});
assert.ok(portable.some(candidate => candidate.id === 'acquired-community-paramedicine'), 'discovery must use acquired text when structured problem tags are absent');
assert.ok(portable[0].discovery.matchedProblemSignals.includes('overcrowding'));

console.log('intervention discovery tests passed');
