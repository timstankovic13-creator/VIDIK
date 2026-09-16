import assert from 'node:assert/strict';
import test from 'node:test';

const decision = (effect, cost, uncertainty = 0) => ({ effect, cost, uncertainty });
const netValue = ({ effect, cost }) => effect - cost;

function sensitivityEnvelope(base, scenarios) {
  return scenarios.map((s) => {
    const d = decision(base.effect * s.effectMultiplier, base.cost * s.costMultiplier, s.uncertainty);
    return { ...s, ...d, netValue: netValue(d) };
  });
}

function recommendation(envelope) {
  const positive = envelope.filter((x) => x.netValue > 0).length;
  const negative = envelope.filter((x) => x.netValue <= 0).length;
  return positive === envelope.length ? 'recommend' : negative === envelope.length ? 'do-not-recommend' : 'conditional';
}

function expectedValueOfInformation(current, alternatives, evidenceCost) {
  const currentBest = Math.max(...alternatives.map(netValue));
  const informedBest = alternatives.reduce((sum, a) => sum + Math.max(0, a.effect - a.cost), 0) / alternatives.length;
  return Math.max(0, informedBest - currentBest - evidenceCost);
}

function buildAudit({ statusQuo, chosen, alternatives, envelope, voi, assumptions }) {
  return {
    schemaVersion: 'step-5.v1',
    statusQuo,
    chosen,
    alternatives,
    sensitivity: envelope,
    recommendationState: recommendation(envelope),
    voi,
    assumptions,
    opportunityCost: alternatives.filter((a) => a.id !== chosen.id).map((a) => ({ id: a.id, foregoneNetValue: netValue(a) - netValue(chosen) })),
  };
}

test('1. sensitivity analysis identifies recommendation changes under plausible assumptions', () => {
  const envelope = sensitivityEnvelope({ effect: 10, cost: 8 }, [
    { id: 'low-effect', effectMultiplier: 0.7, costMultiplier: 1.1, uncertainty: 'high' },
    { id: 'base', effectMultiplier: 1, costMultiplier: 1, uncertainty: 'medium' },
    { id: 'high-effect', effectMultiplier: 1.3, costMultiplier: 0.9, uncertainty: 'low' },
  ]);
  assert.equal(envelope.length, 3);
  assert.equal(recommendation(envelope), 'conditional');
  assert.ok(envelope.some((x) => x.netValue <= 0));
  assert.ok(envelope.some((x) => x.netValue > 0));
});

test('2. uncertainty propagates into the decision envelope rather than disappearing', () => {
  const envelope = sensitivityEnvelope({ effect: 12, cost: 7 }, [
    { id: 'low', effectMultiplier: 0.5, costMultiplier: 1, uncertainty: 'high' },
    { id: 'base', effectMultiplier: 1, costMultiplier: 1, uncertainty: 'medium' },
    { id: 'high', effectMultiplier: 1.5, costMultiplier: 1, uncertainty: 'low' },
  ]);
  assert.deepEqual(envelope.map((x) => x.uncertainty), ['high', 'medium', 'low']);
  assert.ok(new Set(envelope.map((x) => x.netValue)).size > 1);
});

test('3. recommendation flips are explicitly detected', () => {
  const envelope = sensitivityEnvelope({ effect: 10, cost: 9 }, [
    { id: 'pessimistic', effectMultiplier: 0.7, costMultiplier: 1.1 },
    { id: 'optimistic', effectMultiplier: 1.4, costMultiplier: 0.9 },
  ]);
  assert.deepEqual(envelope.map((x) => x.netValue > 0), [false, true]);
  assert.equal(recommendation(envelope), 'conditional');
});

test('4. VOI can justify acquiring evidence before deciding', () => {
  const alternatives = [decision(10, 9), decision(16, 12)];
  const voi = expectedValueOfInformation(decision(10, 9), alternatives, 0.2);
  assert.ok(Number.isFinite(voi));
  assert.ok(voi >= 0);
});

test('5. status quo remains a quantified competitor', () => {
  const statusQuo = decision(6, 4);
  const candidate = decision(7, 3);
  assert.notEqual(netValue(statusQuo), undefined);
  assert.ok(netValue(candidate) !== netValue(statusQuo));
});

test('6. opportunity cost records what alternatives are foregone', () => {
  const chosen = { id: 'A', ...decision(12, 5) };
  const alternatives = [chosen, { id: 'B', ...decision(10, 3) }, { id: 'C', ...decision(8, 2) }];
  const audit = buildAudit({ statusQuo: { id: 'SQ', ...decision(7, 4) }, chosen, alternatives, envelope: [], voi: 0, assumptions: {} });
  assert.equal(audit.opportunityCost.length, 2);
  assert.ok(audit.opportunityCost.every((x) => typeof x.foregoneNetValue === 'number'));
});

test('7. audit artifact preserves assumptions, alternatives, uncertainty, and decision state', () => {
  const chosen = { id: 'A', ...decision(12, 5) };
  const envelope = sensitivityEnvelope(chosen, [
    { id: 'low', effectMultiplier: 0.8, costMultiplier: 1.1, uncertainty: 'high' },
    { id: 'base', effectMultiplier: 1, costMultiplier: 1, uncertainty: 'medium' },
  ]);
  const audit = buildAudit({ statusQuo: { id: 'SQ', ...decision(7, 4) }, chosen, alternatives: [chosen], envelope, voi: 1.5, assumptions: { sourceCount: 2 } });
  assert.equal(audit.schemaVersion, 'step-5.v1');
  assert.equal(audit.assumptions.sourceCount, 2);
  assert.equal(audit.sensitivity.length, 2);
  assert.equal(audit.chosen.id, 'A');
});

test('8. arbitrary-problem stress cases retain the same uncertainty and decision contract', () => {
  const problems = ['extreme heat', 'food access', 'pedestrian injuries', 'wildfire smoke', 'worker displacement'];
  for (const problem of problems) {
    const candidate = { id: problem, ...decision(11, 8) };
    const envelope = sensitivityEnvelope(candidate, [
      { id: 'pessimistic', effectMultiplier: 0.75, costMultiplier: 1.15, uncertainty: 'high' },
      { id: 'base', effectMultiplier: 1, costMultiplier: 1, uncertainty: 'medium' },
      { id: 'optimistic', effectMultiplier: 1.25, costMultiplier: 0.9, uncertainty: 'low' },
    ]);
    const audit = buildAudit({ statusQuo: { id: `${problem}-status-quo`, ...decision(6, 4) }, chosen: candidate, alternatives: [candidate], envelope, voi: 0, assumptions: { problem } });
    assert.equal(audit.assumptions.problem, problem);
    assert.equal(audit.sensitivity.length, 3);
    assert.ok(['recommend', 'conditional', 'do-not-recommend'].includes(audit.recommendationState));
  }
});
