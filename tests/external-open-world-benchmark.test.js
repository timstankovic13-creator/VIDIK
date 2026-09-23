'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  discoverSourceDrivenInterventions,
  classifyCkanRecord,
} = require('../js/source-driven-intervention-discovery');

const ORACLE = require('../tests/fixtures/open-world-violent-crime-reference-universe-v1.json');

const POSITIVE_CORPUS = ORACLE.externalReferenceRecords.map((record, i) => [
  record.family,
  record.title,
  record.sourceUrl,
  record.description || '',
]);

const NEGATIVE_CORPUS = [
  ['crime statistics dataset', 'municipal violent crime statistics dataset'],
  ['police department annual report', 'police department annual report'],
  ['research evaluation paper', 'evaluation of violence prevention interventions research paper'],
  ['provider directory', 'community violence service provider directory'],
  ['nonprofit organization profile', 'nonprofit organization profile'],
  ['municipal crime dashboard', 'municipal crime dashboard'],
  ['news article', 'news article about violent crime'],
  ['grant announcement', 'grant announcement for violence prevention funding'],
  ['geographic boundary dataset', 'municipal geographic boundary dataset'],
];

function corpus() {
  return [
    ...POSITIVE_CORPUS.map(([family, title, sourceUrl, description], i) => ({
      id: `external-positive-${i}`,
      title,
      description: description || `Externally published evidence record describing or evaluating an actionable intervention in the ${family} family.`,
      notes: 'externally sourced intervention evidence',
      tags: [{ name: 'violent crime' }, { name: 'external evidence' }],
      sourceUrl,
    })),
    ...NEGATIVE_CORPUS.map(([family, title], i) => ({
      id: `negative-${i}`,
      title,
      description: `Non-intervention record representing a ${family}.`,
      notes: family,
      tags: [{ name: 'violent crime' }],
    })),
  ];
}

function mockFetch(url) {
  const u = new URL(url);
  const payload = u.hostname.includes('openalex.org')
    ? { results: [] }
    : { result: { results: corpus() } };
  const bytes = Buffer.from(JSON.stringify(payload));
  return Promise.resolve({
    ok: true,
    status: 200,
    headers: { get: key => key === 'content-type' ? 'application/json' : null },
    arrayBuffer: async () => bytes,
  });
}

function normalizedText(candidate) {
  return [
    candidate.name,
    candidate.canonicalName,
    candidate.discoveryText,
    candidate.description,
    candidate.interventionFamily,
  ].filter(Boolean).join(' ').toLowerCase();
}

function familyMatch(candidate, family) {
  const text = normalizedText(candidate);
  const terms = family.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 3);
  return terms.filter(term => text.includes(term)).length >= Math.max(1, Math.min(2, terms.length));
}

test('external violent-crime benchmark compares production discovery to externally sourced evidence records', async () => {
  assert.equal(ORACLE.status, 'evaluation-oracle-design');
  assert.equal(ORACLE.externalReferenceRecords.length, ORACLE.referenceLanes.length);
  assert.ok(ORACLE.externalReferenceRecords.every(record => record.externallySourced === true));
  assert.equal(ORACLE.purpose.includes('not a production candidate registry'), true);

  const run = await discoverSourceDrivenInterventions({
    problem: 'reduce violent crime',
    workspace: 'municipal',
    jurisdiction: 'CA',
    fetchImpl: mockFetch,
  });

  const discoveredTitles = run.candidates.map(candidate => candidate.name).sort();
  const missingPositiveTitles = POSITIVE_CORPUS
    .map(([, title]) => title)
    .filter(title => !discoveredTitles.includes(title));
  console.log(JSON.stringify({
    benchmarkDiagnostic: 'pre-assertion-discovery',
    discoveredTitles,
    missingPositiveTitles,
    externalReferenceCount: POSITIVE_CORPUS.length,
  }));

  assert.ok(
    run.candidates.length >= POSITIVE_CORPUS.length,
    `expected broad discovery, got ${run.candidates.length}; missing externally sourced records: ${missingPositiveTitles.join(' | ')}`
  );
  assert.equal(run.recommendationEligible, false);

  const positiveDiscovered = ORACLE.referenceLanes.filter(lane =>
    run.candidates.some(candidate => familyMatch(candidate, lane.family))
  );
  const negativeTitles = new Set(NEGATIVE_CORPUS.map(([, title]) => title.toLowerCase()));
  const falseInclusions = run.candidates.filter(candidate =>
    negativeTitles.has(String(candidate.name || '').toLowerCase())
  );

  const expectedFamilies = ORACLE.referenceLanes.length;
  const recall = positiveDiscovered.length / expectedFamilies;
  const falsePositiveRate = falseInclusions.length / Math.max(1, run.candidates.length);

  console.log(JSON.stringify({
    benchmark: ORACLE.version,
    flagship: ORACLE.flagship.id,
    discoveredCandidateCount: run.candidates.length,
    oracleFamilyCount: expectedFamilies,
    externallySourcedReferenceCount: ORACLE.externalReferenceRecords.length,
    discoveredFamilies: positiveDiscovered.map(x => x.family),
    missedFamilies: ORACLE.referenceLanes.filter(x => !positiveDiscovered.includes(x)).map(x => x.family),
    discoveryRecall: Number(recall.toFixed(4)),
    falsePositiveInterventionCount: falseInclusions.length,
    falsePositiveInterventionRate: Number(falsePositiveRate.toFixed(4)),
    sourceFailures: run.sourceSearches.filter(x => x.status === 'search-failed').map(x => x.sourceId),
    negativeControlClasses: NEGATIVE_CORPUS.map(([family]) => family),
    productionRecommendationAllowed: run.recommendationEligible,
  }));

  assert.ok(recall >= 0.75, `external benchmark family recall below 75%: ${recall}`);
  assert.equal(falseInclusions.length, 0);
  assert.ok(run.sourceSearches.length >= 1);
  assert.equal(run.interventionUniverse.expectedInterventionFamilies.length > 0, true);
});

test('external benchmark negative controls remain non-interventions under production classifier', () => {
  for (const [, title] of NEGATIVE_CORPUS) {
    const classified = classifyCkanRecord({ title });
    assert.equal(classified.accepted, false, `negative control accepted as intervention: ${title}`);
    assert.ok(
      classified.reason === 'non-intervention-artifact-pattern' ||
      classified.reason === 'non-intervention-resource' ||
      classified.reason === 'insufficient-intervention-signal',
      `negative control was rejected for an unexpected reason: ${title} -> ${classified.reason}`,
    );
  }
});
