'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { discoverSourceDrivenInterventions } = require('../js/source-driven-intervention-discovery');
const { discoverCandidateEvidence } = require('../js/source-driven-evidence-discovery');

const CASES = [
  ['reduce violent crime', 'CA'],
  ['reduce pedestrian injuries', 'CA'],
  ['reduce food insecurity', 'CA'],
  ['reduce extreme heat illness', 'CA'],
  ['reduce wildfire smoke exposure', 'CA'],
  ['reduce worker displacement', 'CA'],
  ['reduce violent crime', 'US'],
  ['reduce homelessness', 'US'],
  ['reduce urban heat', 'UK'],
  ['reduce traffic injuries', 'UK'],
  ['reduce housing construction delays', 'AU'],
  ['reduce youth unemployment', 'AU'],
  ['reduce municipal water contamination', 'CA'],
  ['reduce construction permitting delays', 'CA'],
  ['improve public library wait times', 'CA'],
  ['reduce coastal flood damage', 'US'],
  ['improve small business survival', 'US'],
  ['reduce digital access gaps', 'UK'],
  ['reduce food price volatility', 'AU'],
  ['reduce urban noise pollution', 'UK']
];

function assertDiscoveryBoundary(result, problem, jurisdiction) {
  assert.equal(result.problem, problem);
  assert.equal(result.recommendationEligible, false);
  assert.ok(result.sourceSearches.length > 0, `${jurisdiction}:${problem} searched no sources`);
  assert.ok(result.discoveryHash, `${jurisdiction}:${problem} missing discovery hash`);
  if (result.sourceSearches.every(item => item.status === 'search-failed')) {
    assert.equal(result.candidates.length, 0, `${jurisdiction}:${problem} produced candidates despite total source failure`);
    return { sourceFailureClosed: true };
  }
  assert.ok(result.candidates.length > 0, `${jurisdiction}:${problem} produced no intervention leads`);
  assert.ok(result.candidates.every(candidate => candidate.discovery?.leadOnly === true), `${jurisdiction}:${problem} candidate escaped lead-only boundary`);
  assert.ok(result.candidates.every(candidate => candidate.discovery?.effectsImported === false), `${jurisdiction}:${problem} effect imported into discovery`);
  return { sourceFailureClosed: false };
}

test('production finish line: live blind problem discovery and evidence acquisition remain governed', async () => {
  const summaries = [];
  for (const [problem, jurisdiction] of CASES) {
    const discovery = await discoverSourceDrivenInterventions({ problem, jurisdiction, rows: 10 });
    const boundary = assertDiscoveryBoundary(discovery, problem, jurisdiction);

    if (boundary.sourceFailureClosed) {
      summaries.push({
        jurisdiction,
        problem,
        interventionSources: 0,
        interventionLeads: 0,
        evidenceSources: 0,
        evidenceLeads: 0,
        sourceFailureClosed: true
      });
      continue;
    }

    const candidate = discovery.candidates[0];
    const evidence = await discoverCandidateEvidence({ problem, candidate, rows: 5 });
    assert.equal(evidence.recommendationEligible, false);
    assert.equal(evidence.evidenceComplete, false);
    assert.equal(evidence.effectsImported, false);
    assert.ok(evidence.sourceSearches.length >= 2, `${jurisdiction}:${problem} did not diversify causal evidence search`);
    assert.ok(evidence.sourceSearches.some(item => item.status !== 'search-failed'), `${jurisdiction}:${problem} all evidence sources failed`);
    assert.ok(evidence.discoveryHash, `${jurisdiction}:${problem} missing evidence discovery hash`);
    assert.ok(evidence.evidenceLeads.every(lead => lead.evidenceLeadOnly === true && lead.causalEffectImported === false), `${jurisdiction}:${problem} evidence crossed authority boundary`);

    summaries.push({
      jurisdiction,
      problem,
      interventionSources: discovery.sourceSearches.filter(item => item.status !== 'search-failed').length,
      interventionLeads: discovery.candidates.length,
      evidenceSources: evidence.sourceSearches.filter(item => item.status !== 'search-failed').length,
      evidenceLeads: evidence.evidenceLeads.length,
      sourceFailureClosed: false
    });
  }

  assert.equal(summaries.length, CASES.length);
  assert.ok(summaries.some(item => item.jurisdiction === 'CA'));
  assert.ok(summaries.some(item => item.jurisdiction === 'US'));
  assert.ok(summaries.some(item => item.jurisdiction === 'UK'));
  assert.ok(summaries.some(item => item.jurisdiction === 'AU'));
  console.log(JSON.stringify({ finishLine: 'live-generalization', cases: summaries }, null, 2));
});
