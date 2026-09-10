'use strict';

const assert = require('assert');
const {
  problemSpec,
  buildSearchPlan,
  normalizeRecord,
  dedupeRecords,
  buildEvidenceGaps,
  discoverEvidence,
} = require('../scripts/evidence-discovery-engine');

function mockFetch() {
  return async url => {
    const parsed = new URL(url);
    if (parsed.hostname === 'eutils.ncbi.nlm.nih.gov') {
      if (parsed.pathname.endsWith('/esearch.fcgi')) {
        return { ok: true, json: async () => ({ esearchresult: { idlist: ['101', '102'] } }) };
      }
      return { ok: true, json: async () => ({ result: {
        '101': { uid: '101', title: 'Problem-oriented policing randomized evaluation', pubdate: '2020' },
        '102': { uid: '102', title: 'Community violence intervention controlled study', pubdate: '2021' },
      } }) };
    }
    if (parsed.hostname === 'api.crossref.org') {
      return { ok: true, json: async () => ({ message: { items: [
        { DOI: '10.1000/example', title: ['Problem-oriented policing randomized evaluation'], URL: 'https://doi.org/10.1000/example', published: { 'date-parts': [[2020]] } },
        { DOI: '10.1000/example-2', title: ['Hospital violence intervention cost study'], URL: 'https://doi.org/10.1000/example-2', published: { 'date-parts': [[2021]] } },
      ] } }) };
    }
    throw new Error(`unexpected-url:${url}`);
  };
}

(async () => {
  const spec = problemSpec('reduce violent crime', { population: 'youth', geography: 'Canadian municipality' });
  assert.strictEqual(spec.outcome, 'reduce violent crime');

  const plan = buildSearchPlan(spec, ['hot-spots policing', 'community violence intervention']);
  assert(plan.queries.some(query => query.includes('hot-spots policing')));
  assert(plan.queries.some(query => query.includes('systematic review')));
  assert(plan.requiredEvidenceFields.includes('resourceOrCost'));

  const normalized = normalizeRecord('pubmed', { id: '1', title: 'Test intervention evaluation', url: 'https://example.test' }, 'query');
  assert.strictEqual(normalized.discoveryStatus, 'discovered');
  assert.strictEqual(normalized.causalAdmissibility, 'unverified');
  assert.strictEqual(normalized.transportability, 'unverified');

  const duplicate = dedupeRecords([normalized, { ...normalized, provider: 'crossref' }]);
  assert.strictEqual(duplicate.length, 1);

  const gaps = buildEvidenceGaps(spec, [normalized], ['hot-spots policing']);
  assert(gaps.includes('causal-design-not-yet-established'));
  assert(gaps.includes('resource-or-cost-evidence-missing'));

  const result = await discoverEvidence({
    problem: 'reduce violent crime',
    outcome: 'violent crime',
    population: 'municipal population',
    geography: 'Canadian municipality',
    seedCandidates: ['hot-spots policing', 'community violence intervention'],
    providers: ['pubmed', 'crossref'],
    fetchImpl: mockFetch(),
    limit: 2,
  });

  assert.strictEqual(result.schemaVersion, 'vidik-evidence-discovery.v1');
  assert.strictEqual(result.status, 'discovered');
  assert(result.records.length >= 3);
  assert(result.candidates.some(candidate => candidate.origin === 'seed'));
  assert(result.candidates.some(candidate => candidate.origin === 'literature-discovered'));
  assert.strictEqual(result.recommendationReady, false);
  assert(result.note.includes('does not manufacture'));

  console.log('evidence-discovery-engine: all assertions passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
