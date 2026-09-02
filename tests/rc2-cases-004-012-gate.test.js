'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const governance = require('../js/rc2-evidence-governance');

const cases = ['004','005','006','007','008','009','010','011','012'];

describe('RC2 Cases 004-012 evidence gate', () => {
  for (const candidateId of cases) {
    it(`keeps Case ${candidateId} blocked when candidate-level causal evidence is incomplete`, () => {
      const chain = {
        historicalStages: ['resource','capacity','activity'],
        currentLearningStages: ['outcome','systemOutcome']
      };
      const gate = governance.promotionGate({
        chain,
        causalIdentification: false,
        attribution: false,
        counterfactual: false,
        transportability: false,
        uncertaintyTested: false,
        sensitivityTested: false,
        alternativesTested: false,
        lineageReproducible: true
      });
      assert.equal(gate.eligible, false);
      assert.equal(gate.recommendation, 'NO RECOMMENDATION');
    });
  }

  it('does not treat later learning evidence as historical evidence', () => {
    const items = [
      ...['resource','capacity','activity'].map(stage => ({candidateId:'009',stage,asOf:'2023-12-01',geography:'Ottawa',publicationTimeStatus:'KNOWN'})),
      ...['outcome','systemOutcome'].map(stage => ({candidateId:'009',stage,asOf:'2026-01-01',geography:'Ottawa',publicationTimeStatus:'KNOWN'}))
    ];
    const chain = governance.evaluateChain(items, '009');
    assert.deepEqual(chain.historicalStages, ['resource','capacity','activity']);
    assert.deepEqual(chain.currentLearningStages, ['outcome','systemOutcome']);
  });
});
