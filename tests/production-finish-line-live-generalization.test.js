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

test('wildfire smoke retrieval vocabulary remains actionable at the intervention boundary', () => {
  const { isActionableInterventionTitle, interventionMatchesProblem, buildDiscoveryQueries } = require('../js/source-driven-intervention-discovery');
  for (const name of ['wildfire smoke mitigation', 'smoke filtration', 'wildfire evacuation support', 'clean air shelter']) {
    assert.equal(isActionableInterventionTitle(name), true, name);
    assert.equal(interventionMatchesProblem('reduce wildfire smoke exposure', { name, discoveryText: name }, 'municipal'), true, name);
  }
  const queries = buildDiscoveryQueries('reduce wildfire smoke exposure', 'municipal');
  assert.ok(queries.some(query => /wildfire smoke mitigation|smoke filtration|clean air shelter|wildfire evacuation support/i.test(query)));
});


test('youth unemployment expands to youth-employment intervention classes', () => {
  const { buildDiscoveryQueries, expectedInterventionFamilies } = require('../js/source-driven-intervention-discovery');
  const queries = buildDiscoveryQueries('reduce youth unemployment', 'municipal');
  assert.ok(queries.some(query => /youth employment|youth apprenticeship|school-to-work transition|employment services/i.test(query)));
  assert.ok(expectedInterventionFamilies('reduce youth unemployment', 'municipal').includes('employment'));
});

test('worker displacement expands to transition and redeployment intervention classes', async () => {
  const { buildDiscoveryQueries, taxonomyTerms, expectedInterventionFamilies } = require('../js/source-driven-intervention-discovery');
  const queries = buildDiscoveryQueries('reduce worker displacement', 'research');
  assert.ok(queries.some(query => /redeployment|worker transition|displacement support|reskilling/i.test(query)));
  assert.ok(taxonomyTerms('reduce worker displacement', 'research').some(term => /worker|displacement|redeployment/i.test(term)));
  assert.ok(expectedInterventionFamilies('reduce worker displacement', 'research').includes('employment'));
});

async function runWithTimeout(task, label, timeoutMs = 90000) {
  let timer;
  try {
    return await Promise.race([task(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('live finish-line timeout after ' + timeoutMs + 'ms: ' + label)), timeoutMs); })]);
  } finally { clearTimeout(timer); }
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length); let next = 0;
  async function runWorker() { while (true) { const index = next++; if (index >= items.length) return; results[index] = await worker(items[index]); } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runWorker()));
  return results;
}

test('production finish line: live blind problem discovery and evidence acquisition remain governed', async () => {
  const summaries = await mapWithConcurrency(CASES, 2, async ([problem, jurisdiction]) => {
    return runWithTimeout(async () => {
      const discovery = await discoverSourceDrivenInterventions({ problem, jurisdiction, rows: 10 });
      const boundary = assertDiscoveryBoundary(discovery, problem, jurisdiction);
      if (boundary.sourceFailureClosed) return { jurisdiction, problem, interventionSources: 0, interventionLeads: 0, evidenceSources: 0, evidenceLeads: 0, sourceFailureClosed: true };
      const evidenceResults = await Promise.all(
        discovery.candidates.slice(0, 1).map(candidate => discoverCandidateEvidence({ problem, candidate, rows: 5 }))
      );
      // Evidence may legitimately remain incomplete for a blind problem. The governed
      // finish line requires an auditable evidence search and failure-closed state, not
      // fabricated completeness or recommendation authority.
      const evidence = evidenceResults[0];
      assert.ok(evidence, jurisdiction + ':' + problem + ' produced no evidence acquisition result');
      assert.equal(evidence.recommendationEligible, false);
      assert.equal(evidence.effectsImported, false);
      assert.ok(evidence.sourceSearches.length >= 2, jurisdiction + ':' + problem + ' did not diversify causal evidence search');
      assert.ok(evidence.sourceSearches.some(item => item.status !== 'search-failed'), jurisdiction + ':' + problem + ' all evidence sources failed');
      assert.ok(evidence.discoveryHash, jurisdiction + ':' + problem + ' missing evidence discovery hash');
      assert.ok(evidence.evidenceLeads.every(lead => lead.evidenceLeadOnly === true && lead.causalEffectImported === false), jurisdiction + ':' + problem + ' evidence crossed authority boundary');
      return { jurisdiction, problem, interventionSources: discovery.sourceSearches.filter(item => item.status !== 'search-failed').length, interventionLeads: discovery.candidates.length, evidenceSources: evidence.sourceSearches.filter(item => item.status !== 'search-failed').length, evidenceLeads: evidence.evidenceLeads.length, sourceFailureClosed: false };
    }, jurisdiction + ':' + problem);
  });
  assert.equal(summaries.length, CASES.length);
  assert.ok(summaries.some(item => item.jurisdiction === 'CA'));
  assert.ok(summaries.some(item => item.jurisdiction === 'US'));
  assert.ok(summaries.some(item => item.jurisdiction === 'UK'));
  assert.ok(summaries.some(item => item.jurisdiction === 'AU'));
  console.log(JSON.stringify({ finishLine: 'live-generalization', cases: summaries }, null, 2));
});
