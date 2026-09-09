'use strict';

/*
 * Step 4: independent verification of the production causal parameter slice.
 *
 * This verifier intentionally does NOT derive its expectations from the
 * production evidence registry. It encodes independently checked source facts
 * and independently recomputes the Melbourne uncertainty interval from the
 * published matched-sample counts. Municipal observations are not causal
 * evidence and transportability similarity alone never establishes causality.
 */

const assert = require('assert');
const { PRODUCTION_HOUSING_EVIDENCE } = require('../evidence/production-housing-evidence');

const EXPECTED = Object.freeze({
  Ottawa: Object.freeze({
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/31438912/',
    sourceJurisdiction: 'Canada',
    targetJurisdiction: 'Ottawa, Canada',
    evidenceType: 'causal',
    estimate: 3.12,
    unit: 'odds ratio for stable housing',
    low: 1.96,
    high: 4.27,
    mode: 'transported',
    expectedSourceFact: 'HF+ACT vs TAU stable-housing OR 3.12 (95% CI 1.96-4.27)'
  }),
  Toronto: Object.freeze({
    sourceUrl: 'https://pubmed.ncbi.nlm.nih.gov/27619826/',
    sourceJurisdiction: 'Canada',
    targetJurisdiction: 'Toronto, Canada',
    evidenceType: 'causal',
    estimate: 45.8,
    unit: 'percentage-point difference in mean proportion of time stably housed',
    low: 37.1,
    high: 54.4,
    mode: 'site-supported',
    expectedSourceFact: 'HF+ACT vs TAU stable-housing time difference 45.8 percentage points (95% CI 37.1-54.4)'
  }),
  Melbourne: Object.freeze({
    sourceUrl: 'https://assets.csi.edu.au/assets/research/J2SI-Third-Year-Outcomes-Report.pdf',
    sourceJurisdiction: 'Melbourne, Australia',
    targetJurisdiction: 'Melbourne, Australia',
    evidenceType: 'causal',
    interventionPermanentHousing: 23,
    interventionN: 37,
    comparisonPermanentHousing: 15,
    comparisonN: 53,
    mode: 'site-supported',
    expectedSourceFact: 'Wave 7 matched sample: 62.2% (23/37) vs 28.3% (15/53) permanently housed'
  })
});

function approx(actual, expected, tolerance = 1e-9) {
  return Math.abs(actual - expected) <= tolerance;
}

function assertSame(label, actual, expected) {
  assert.strictEqual(actual, expected, `${label}: expected ${expected}, got ${actual}`);
}

function verifyCommon(city, record, expected) {
  assert.ok(record, `${city}: production evidence record missing`);
  assertSame(`${city}.sourceUrl`, record.sourceUrl, expected.sourceUrl);
  assertSame(`${city}.sourceJurisdiction`, record.sourceJurisdiction, expected.sourceJurisdiction);
  assertSame(`${city}.targetJurisdiction`, record.targetJurisdiction, expected.targetJurisdiction);
  assertSame(`${city}.evidenceType`, record.evidenceType, expected.evidenceType);
  assertSame(`${city}.mode`, record.mode, expected.mode);
  assert.ok(record.provenance && record.provenance.length > 0, `${city}: provenance is missing`);
  assert.ok(record.transportability, `${city}: transportability record is missing`);
  assert.strictEqual(record.transportability.admissible, true, `${city}: causal evidence marked inadmissible`);
}

function verifyOttawa() {
  const city = 'Ottawa';
  const record = PRODUCTION_HOUSING_EVIDENCE[city];
  const expected = EXPECTED[city];
  verifyCommon(city, record, expected);
  assertSame(`${city}.estimate`, record.estimate, expected.estimate);
  assertSame(`${city}.unit`, record.unit, expected.unit);
  assertSame(`${city}.uncertainty.low`, record.uncertainty.low, expected.low);
  assertSame(`${city}.uncertainty.high`, record.uncertainty.high, expected.high);
  assert.match(record.provenance, /PMID 31438912/);
  assert.match(record.provenance, /not conducted in Ottawa/i);
}

function verifyToronto() {
  const city = 'Toronto';
  const record = PRODUCTION_HOUSING_EVIDENCE[city];
  const expected = EXPECTED[city];
  verifyCommon(city, record, expected);
  assertSame(`${city}.estimate`, record.estimate, expected.estimate);
  assertSame(`${city}.unit`, record.unit, expected.unit);
  assertSame(`${city}.uncertainty.low`, record.uncertainty.low, expected.low);
  assertSame(`${city}.uncertainty.high`, record.uncertainty.high, expected.high);
  assert.match(record.provenance, /PMID 27619826/);
  assert.match(record.provenance, /Toronto/);
}

function verifyMelbourne() {
  const city = 'Melbourne';
  const record = PRODUCTION_HOUSING_EVIDENCE[city];
  const expected = EXPECTED[city];
  verifyCommon(city, record, expected);

  const p1 = expected.interventionPermanentHousing / expected.interventionN;
  const p2 = expected.comparisonPermanentHousing / expected.comparisonN;
  const estimate = p1 - p2;
  const standardError = Math.sqrt(
    (p1 * (1 - p1)) / expected.interventionN +
    (p2 * (1 - p2)) / expected.comparisonN
  );
  const low = estimate - 1.96 * standardError;
  const high = estimate + 1.96 * standardError;

  assert.ok(approx(record.estimate, estimate, 1e-12), `Melbourne estimate mismatch: expected independently reconstructed ${estimate}, got ${record.estimate}`);
  assert.ok(approx(record.uncertainty.low, low, 1e-12), `Melbourne lower bound mismatch: expected independently reconstructed ${low}, got ${record.uncertainty.low}`);
  assert.ok(approx(record.uncertainty.high, high, 1e-12), `Melbourne upper bound mismatch: expected independently reconstructed ${high}, got ${record.uncertainty.high}`);
  assert.strictEqual(record.uncertaintyMethod.includes('Wald'), true, 'Melbourne uncertainty method must disclose the Wald reconstruction');
  assert.match(record.provenance, /62\.2% permanent housing/);
  assert.match(record.provenance, /28\.3%/);
}

verifyOttawa();
verifyToronto();
verifyMelbourne();

console.log('Independent evidence/parameter verification: PASS');
console.log('Ottawa: source facts, causal estimate, uncertainty, provenance, transport boundary verified.');
console.log('Toronto: source facts, causal estimate, uncertainty, site support, provenance verified.');
console.log('Melbourne: source facts, effect reconstruction, uncertainty reconstruction, provenance verified.');
