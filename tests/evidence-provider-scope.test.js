'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const Evidence = require('../js/source-driven-evidence-discovery');

test('international evidence providers remain available across decision jurisdictions', () => {
  for (const jurisdiction of ['CA','US','UK','AU','international']) {
    assert.equal(
      Evidence.sourceIsAuthoritative({ sourceId: 'openalex-works', jurisdiction }),
      true,
      'OpenAlex must remain available for ' + jurisdiction
    );
    assert.equal(
      Evidence.sourceIsAuthoritative({ sourceId: 'crossref-works', jurisdiction }),
      true,
      'Crossref must remain available for ' + jurisdiction
    );
    assert.equal(
      Evidence.sourceIsAuthoritative({ sourceId: 'pubmed-eutils', jurisdiction }),
      true,
      'PubMed must remain available for ' + jurisdiction
    );
  }
});

test('candidate evidence can use multiple independent providers for Canadian decisions', async () => {
  const candidate = {
    id: 'candidate:focused-deterrence',
    name: 'Focused Deterrence',
    discoveryText: 'focused deterrence group violence intervention',
    interventionFamily: ['public-safety']
  };
  const result = await Evidence.discoverCandidateEvidence({
    problem: 'reduce violent crime',
    candidate,
    fetchImpl: async url => ({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      arrayBuffer: async () => Buffer.from(
        url.includes('eutils.ncbi.nlm.nih.gov')
          ? JSON.stringify({ esearchresult: { idlist: ['1'] } })
          : url.includes('api.openalex.org')
            ? JSON.stringify({ results: [{ id: 'W1', display_name: 'Focused Deterrence Group Violence Intervention' }] })
            : JSON.stringify({ message: { items: [{ DOI: '10.1234/focused', title: ['Focused deterrence group violence intervention evaluation'], abstract: 'Focused deterrence group violence intervention evaluation' }] } })
      )
    }),
    sources: [
      { sourceId: 'openalex-works', jurisdiction: 'international', domain: 'causal-evidence' },
      { sourceId: 'pubmed-eutils', jurisdiction: 'US', domain: 'causal-evidence' },
      { sourceId: 'crossref-works', jurisdiction: 'international', domain: 'causal-evidence' }
    ]
  });
  assert.ok(result.sourceDiagnostics['openalex-works'].attempted > 0);
  assert.ok(result.sourceDiagnostics['pubmed-eutils'].attempted > 0);
  assert.ok(result.sourceDiagnostics['crossref-works'].attempted > 0);
});
