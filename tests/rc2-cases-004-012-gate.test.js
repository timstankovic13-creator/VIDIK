'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const governance = require('../js/rc2-evidence-governance');

const cases = ['004','005','006','007','008','009','010','011','012'];

const historicalFixture = stage => ({
  evidenceId:`fixture-${stage}`,
  sourceRecordId:`source-${stage}`,
  candidateId:'009',
  stage,
  asOf:'2023-12-01',
  geography:'Ottawa',
  publicationTimeStatus:'KNOWN',
  url:'https://example.com/rc2-fixture'
});

const currentFixture = stage => ({
  ...historicalFixture(stage),
  evidenceId:`current-${stage}`,
  sourceRecordId:`current-source-${stage}`,
  asOf:'2026-01-01'
});

describe('RC2 Cases 004-012 evidence gate', () => {
  for (const candidateId of cases) {
    it(`keeps Case ${candidateId} blocked when candidate-level causal evidence is incomplete`, () => {
      const chain = {
        candidateId,
        historicalStages: ['resource','capacity','activity'],
        currentLearningStages: ['outcome','systemOutcome'],
        missingHistorical: ['outcome','systemOutcome'],
        seriousHarmHistorical: false
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
      assert.ok(gate.failures.includes('historical-executable-chain-incomplete'));
      assert.ok(gate.failures.includes('serious-harm-pathway-incomplete'));
    });
  }

  it('does not treat later learning evidence as historical evidence', () => {
    const items = [
      ...['resource','capacity','activity'].map(historicalFixture),
      ...['outcome','systemOutcome'].map(currentFixture)
    ];
    const chain = governance.evaluateChain(items, '009');
    assert.deepEqual(chain.historicalStages, ['resource','capacity','activity']);
    assert.deepEqual(chain.currentLearningStages, ['outcome','systemOutcome']);
  });
});
