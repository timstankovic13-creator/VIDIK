import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCanonicalAnalysis, selectOpportunityCost } from '../js/vidik-production-closed-loop.js';

test('production path exposes canonical sensitivity, flips, uncertainty, and VOI together', () => {
  const candidates = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }];
  const verified = { parametersByCandidate: {
    a: { parameter: { estimate: 10, uncertainty: { low: 4, high: 14 }, unit: 'outcome/CAD' } },
    b: { parameter: { estimate: 8, uncertainty: { low: 6, high: 12 }, unit: 'outcome/CAD' } },
  } };
  const result = buildCanonicalAnalysis({ candidates, verified, baseline: { objective: 0 }, scoreFn: values => {
    const a = Number(values['a.effect'] || 0), b = Number(values['b.effect'] || 0);
    return { score: a - b, recommendation: a >= b ? 'a' : 'b' };
  }, decisionValue: 1, sensitivitySteps: 21, uncertaintySamples: 200 });
  const analysis = result.analysis;
  assert.equal(analysis.version, '9.7.1');
  assert.ok(analysis.integrityHash);
  assert.ok(Array.isArray(analysis.sensitivity.parameters));
  assert.ok(Array.isArray(analysis.recommendationFlips));
  assert.ok(analysis.uncertainty.sampleCount >= 200);
  assert.ok(Number.isFinite(analysis.voi.expectedValueOfInformation));
});

test('production path records opportunity cost across candidate alternatives', () => {
  const record = selectOpportunityCost({ scores: { A: { outcome: 14 }, B: { outcome: 12 }, C: { outcome: 9 }, STATUS_QUO: { outcome: 8 } }, selectedId: 'B' });
  assert.equal(record.selectedIntervention, 'B');
  assert.equal(record.foregoneIntervention, 'A');
  assert.equal(record.foregoneExpectedOutcome, 14);
  assert.equal(record.selectedExpectedOutcome, 12);
  assert.equal(record.difference, -2);
  assert.deepEqual(record.alternativesConsidered, ['A', 'B', 'C', 'STATUS_QUO']);
});
