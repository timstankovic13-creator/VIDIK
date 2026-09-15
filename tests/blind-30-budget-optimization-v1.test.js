'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { buildDecisionAnalysisInputs } = require('../js/decision-quantification');

const problems = [
  'extreme heat', 'pedestrian injuries', 'food insecurity', 'youth violence', 'wildfire smoke',
  'overdose deaths', 'homelessness', 'eviction risk', 'senior isolation', 'falls', 'diabetes', 'asthma',
  'worker heat illness', 'traffic fatalities', 'school-zone injuries', 'bicycle injuries', 'transit safety',
  'domestic violence access', 'newcomer employment', 'long-term unemployment', 'worker injuries', 'food waste',
  'urban flooding', 'water advisories', 'energy poverty', 'fire risk', 'park safety', 'youth loneliness',
  'maternal health', 'ED crowding'
];

const budgets = [900000, 800000, 700000, 1000000, 650000, 900000, 1200000, 600000, 500000, 450000];
const costs = [600000, 400000, 500000];
const effects = [5, 8, 6];
const expectedWinner = 1;

function make(i) {
  const candidates = costs.map((_, j) => ({
    id: `case-${i}-option-${j}`,
    name: `Option ${j + 1}`,
    problemTags: [problems[i]]
  }));

  const evidence = Object.fromEntries(candidates.map((candidate, j) => [candidate.id, {
    causal: {
      verified: true,
      evidenceType: 'causal',
      estimate: effects[j],
      unit: 'standardized outcome units',
      uncertainty: { low: 1, high: 10 },
      sourceId: `${candidate.id}-causal`,
      provenance: { sourceId: `${candidate.id}-causal` },
      transportability: { admissible: true }
    }
  }]));

  const marginalResources = Object.fromEntries(candidates.map((candidate, j) => [candidate.id, {
    intervention: candidate.id,
    resourceUnit: 'CAD',
    resourceAmount: costs[j],
    incrementalCapacity: 10,
    incrementalActivity: 10,
    incrementalOutcome: effects[j],
    unit: 'standardized outcome units',
    evidenceId: `${candidate.id}-outcome`,
    evidenceIds: [
      `${candidate.id}-capacity`,
      `${candidate.id}-activity`,
      `${candidate.id}-outcome`
    ],
    provenance: 'verified resource -> capacity -> activity -> outcome',
    uncertainty: { low: 1, high: 10 },
    transportability: { admissible: true }
  }]));

  return buildDecisionAnalysisInputs({
    candidates,
    evidence,
    marginalResources,
    voiValues: Object.fromEntries(candidates.map((candidate, j) => [candidate.id, [1, 2, 1.2][j]])),
    budget: { amount: budgets[i % budgets.length], unit: 'CAD' },
    statusQuo: { explicit: true, effect: 0 }
  });
}

test('30 blind municipal problems perform budget-constrained marginal optimization', () => {
  for (let i = 0; i < problems.length; i += 1) {
    const result = make(i);
    const expectedBudget = budgets[i % budgets.length];
    const winnerId = `case-${i}-option-${expectedWinner}`;

    assert.equal(result.optimization.status, 'OPTIMIZED', problems[i]);
    assert.equal(result.candidates.length, 3, `${problems[i]} must expose all admissible candidates`);
    assert.equal(result.blocked.length, 0, `${problems[i]} unexpectedly blocked a quantitatively admissible candidate`);
    assert.equal(result.optimization.allocation.intervention, winnerId, `${problems[i]} must select the highest marginal outcome/resource candidate`);
    assert.equal(result.optimization.allocation.amount, expectedBudget, `${problems[i]} must allocate the actual decision budget`);
    assert.equal(result.optimization.allocation.unit, 'CAD');
    assert.ok(result.optimization.allocation.amount <= expectedBudget, `${problems[i]} exceeds budget`);
    assert.ok(result.optimization.candidates.every(candidate => result.candidates.some(c => c.id === candidate.id)));
    assert.ok(result.optimization.candidates.every(candidate => candidate.status === 'OPTIMIZABLE'));
    assert.equal(result.statusQuo.explicit, true);
  }
});

test('mixed evidence remains auditable while only admissible candidates reach optimization', () => {
  const i = 0;
  const admissible = make(i);
  const blockedId = 'case-mixed-incomplete';
  const result = buildDecisionAnalysisInputs({
    candidates: [
      ...admissible.candidates.map(candidate => ({ id: candidate.id, name: candidate.name, problemTags: ['mixed-evidence'] })),
      { id: blockedId, name: 'Evidence-incomplete option', problemTags: ['mixed-evidence'] }
    ],
    evidence: {
      ...Object.fromEntries(admissible.candidates.map(candidate => [candidate.id, {
        causal: {
          verified: true, evidenceType: 'causal', estimate: candidate.id.endsWith('option-0') ? 5 : candidate.id.endsWith('option-1') ? 8 : 6,
          unit: 'standardized outcome units', uncertainty: { low: 1, high: 10 }, sourceId: `${candidate.id}-causal`,
          provenance: { sourceId: `${candidate.id}-causal` }, transportability: { admissible: true }
        }
      }])),
      [blockedId]: { causal: { verified: false, evidenceType: 'promising', estimate: 99, unit: 'standardized outcome units' } }
    },
    marginalResources: {
      ...Object.fromEntries(admissible.candidates.map((candidate, j) => [candidate.id, {
        intervention: candidate.id, resourceUnit: 'CAD', resourceAmount: costs[j], incrementalCapacity: 10,
        incrementalActivity: 10, incrementalOutcome: [5, 8, 6][j], unit: 'standardized outcome units', evidenceId: `${candidate.id}-outcome`,
        evidenceIds: [`${candidate.id}-capacity`, `${candidate.id}-activity`, `${candidate.id}-outcome`], provenance: 'verified',
        uncertainty: { low: 1, high: 10 }, transportability: { admissible: true }
      }]))
    },
    voiValues: Object.fromEntries(admissible.candidates.map((candidate, j) => [candidate.id, [1, 2, 1.2][j]])),
    budget: { amount: 500000, unit: 'CAD' },
    statusQuo: { explicit: true, effect: 0 }
  });

  assert.equal(result.evidenceCoverage.admissible, 3);
  assert.equal(result.evidenceCoverage.blocked, 1);
  assert.equal(result.evidenceCoverage.mixed, true);
  assert.equal(result.blocked[0].candidateId, blockedId);
  assert.equal(result.optimization.status, 'OPTIMIZED');
  assert.equal(result.optimization.allocation.intervention, 'case-0-option-1');
  assert.ok(!result.optimization.candidates.some(candidate => candidate.id === blockedId));
  assert.equal(result.optimization.allocation.amount, 500000);
  assert.equal(result.recommendationReady, true);
});
