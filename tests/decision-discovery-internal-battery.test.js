'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { executeDecisionDiscovery } = require('../js/decision-discovery-execution');

const CASES = [
  ['reduce violent crime', 'violence interruption', ['violent-crime']],
  ['reduce emergency department overcrowding', 'community paramedicine', ['emergency-department-overcrowding']],
  ['reduce homelessness', 'supportive housing', ['homelessness']],
  ['reduce traffic injuries', 'automated speed enforcement', ['traffic-injuries']],
  ['reduce opioid mortality', 'low-barrier treatment access', ['opioid-mortality']],
  ['reduce urban heat exposure', 'cool-roof program', ['urban-heat']],
  ['reduce library wait times', 'mobile library service', ['library-wait-times']],
  ['reduce small-business vacancy', 'commercial revitalization grant', ['small-business-vacancy']]
];

function searchersFor(candidate) {
  return {
    'local-program': async () => ({
      sourceId: 'internal-local',
      jurisdiction: 'TEST',
      candidates: [{
        id: `internal-${candidate.id}`,
        name: candidate.name,
        problemTags: candidate.tags,
        requiredEvidence: ['causal'],
        provenance: [{ sourceId: 'internal-local', sourceType: 'local-program' }]
      }]
    }),
    'official-data': async () => ({ sourceId: 'internal-official', candidates: [] }),
    research: async () => ({ sourceId: 'internal-research', candidates: [] }),
    'intervention-library': async () => ({ sourceId: 'internal-library', candidates: [] })
  };
}

test('internal battery: arbitrary problem classes discover candidates without a curated problem allowlist', async () => {
  for (const [problem, name, tags] of CASES) {
    const run = await executeDecisionDiscovery({
      problem,
      requiredSourceTypes: ['local-program', 'official-data', 'research', 'intervention-library'],
      searchers: searchersFor({ id: name.replace(/[^a-z0-9]+/gi, '-'), name, tags }),
      evidenceSearcher: async ({ candidate }) => ({
        status: 'evidence-complete',
        sourceIds: ['internal-evidence'],
        evidence: { causal: { status: 'supported', estimate: 0.1, uncertainty: { low: 0.05, high: 0.15 } } }
      })
    });

    assert.equal(run.candidates.length, 1, `candidate not discovered for: ${problem}`);
    assert.equal(run.candidates[0].name, name);
    assert.equal(run.candidates[0].evidenceState, 'evidence-complete');
    assert.equal(run.candidates[0].provenance[0].sourceId, 'internal-local');
    assert.equal(run.discoveryAudit.discoverySearchComplete, true);
  }
});

test('internal battery: administrative vocabulary cannot create a false intervention match', async () => {
  const run = await executeDecisionDiscovery({
    problem: 'reduce municipal aviation noise',
    requiredSourceTypes: ['local-program'],
    searchers: {
      'local-program': async () => ({
        sourceId: 'internal-local',
        candidates: [{ id: 'wrong', name: 'Municipal fleet replacement', problemTags: ['municipal-fleet'], requiredEvidence: ['causal'] }]
      })
    }
  });

  assert.equal(run.candidates.length, 0);
  assert.equal(run.discoveryDiagnostics.unmatched.length, 1);
  assert.equal(run.discoveryDiagnostics.unmatched[0].id, 'wrong');
});

test('internal battery: evidence failure remains a blocker and never becomes zero effect', async () => {
  const run = await executeDecisionDiscovery({
    problem: 'reduce violent crime',
    requiredSourceTypes: ['local-program'],
    searchers: {
      'local-program': async () => ({ sourceId: 'internal-local', candidates: [{ id: 'candidate', name: 'Violence interruption', problemTags: ['violent-crime'], requiredEvidence: ['causal'] }] })
    },
    evidenceSearcher: async () => { throw new Error('internal-evidence-outage'); }
  });

  assert.equal(run.candidates[0].evidenceState, 'evidence-gap');
  assert.equal(run.governance.recommendationAllowed, false);
  assert.equal(run.decision.recommendation, null);
});

console.log('decision-discovery-internal-battery.test.js: PASS');
