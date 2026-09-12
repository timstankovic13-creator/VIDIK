'use strict';

const assert = require('assert');
const { buildResearchQuery, buildOpenAlexUrl, extractResearchLeads } = require('../js/research-discovery');

assert.strictEqual(buildResearchQuery({ problem: 'violent crime', outcome: 'homicide', geography: 'municipal' }), 'violent crime homicide municipal');
const url = new URL(buildOpenAlexUrl({ problem: 'violent crime', intervention: 'hot spots policing' }));
assert.strictEqual(url.protocol, 'https:');
assert.strictEqual(url.hostname, 'api.openalex.org');
assert.strictEqual(url.searchParams.get('per-page'), '25');

const leads = extractResearchLeads({ results: [
  { id: 'https://openalex.org/W1', title: 'Hot spots policing', publication_year: 2024, doi: 'https://doi.org/x', cited_by_count: 4, type: 'article', open_access: { is_oa: true }, concepts: [{ id: 'C1', display_name: 'Crime', score: 0.9 }] },
  { id: null, title: 'discard me' }
] });
assert.strictEqual(leads.length, 1);
assert.strictEqual(leads[0].evidenceStatus, 'potential');
assert.strictEqual(leads[0].title, 'Hot spots policing');
assert.strictEqual(leads[0].concepts[0].displayName, 'Crime');

console.log('research-discovery.test.js: PASS');
