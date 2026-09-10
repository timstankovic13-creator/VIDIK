'use strict';

/*
 * VIDIK Evidence Discovery Engine
 *
 * The intervention universe is a seed ontology, not a ceiling. This module
 * turns a municipal problem into an evidence-search plan, queries independent
 * evidence providers, normalizes returned records, discovers candidate
 * interventions, and reports evidence gaps. Discovery NEVER makes an option
 * causally admissible or recommendation-ready.
 */

const DEFAULT_PROVIDERS = Object.freeze(['pubmed', 'crossref']);
const DEFAULT_LIMIT = 20;
const DEFAULT_TIMEOUT_MS = 8000;

const STOP_WORDS = new Set([
  'the','and','for','with','from','into','using','use','effects','effect','impact',
  'evaluation','evaluating','trial','study','studies','systematic','review','reviews',
  'randomized','randomised','controlled','program','programme','intervention','policy',
  'community','municipal','city','cities','urban','outcomes','outcome','crime','health'
]);

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function slug(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function problemSpec(problem, options = {}) {
  const text = clean(problem);
  if (!text) throw new Error('problem-required');
  const outcome = clean(options.outcome || text);
  const population = clean(options.population || 'population affected by the municipal problem');
  const geography = clean(options.geography || 'municipal or comparable urban setting');
  const horizon = clean(options.timeHorizon || 'medium-term municipal outcome');
  return { problem: text, outcome, population, geography, timeHorizon: horizon };
}

function buildSearchPlan(spec, seedCandidates = []) {
  const base = `${spec.problem} ${spec.outcome}`;
  const designTerms = ['systematic review', 'meta-analysis', 'randomized', 'quasi-experimental', 'controlled evaluation'];
  const contextTerms = [spec.population, spec.geography].filter(Boolean);
  const candidateTerms = unique(seedCandidates.map(item => typeof item === 'string' ? item : item?.name));
  const queries = [];
  queries.push(`${base} systematic review`);
  queries.push(`${base} meta-analysis intervention`);
  queries.push(`${base} causal evaluation intervention`);
  for (const candidate of candidateTerms.slice(0, 20)) {
    queries.push(`${candidate} ${spec.outcome} evaluation`);
  }
  return {
    schemaVersion: 'vidik-evidence-search-plan.v1',
    spec,
    queries: unique(queries),
    requiredEvidenceFields: [
      'intervention', 'outcome', 'population', 'comparator', 'effect',
      'studyDesign', 'setting', 'timeHorizon', 'resourceOrCost', 'implementationConditions'
    ],
    preferredDesigns: designTerms,
    contextTerms,
  };
}

function safeText(value) {
  return clean(Array.isArray(value) ? value.join(' ') : value);
}

function extractTerms(title) {
  return unique(safeText(title).toLowerCase()
    .replace(/[^a-z0-9 -]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 5 && !STOP_WORDS.has(word)))
    .slice(0, 8);
}

function normalizeRecord(provider, item, query) {
  const title = safeText(item.title);
  const abstract = safeText(item.abstract || item.description || item.snippet);
  const url = clean(item.url || item.link || item.doiUrl);
  const publishedAt = clean(item.publishedAt || item.published || item.date);
  const doi = clean(item.doi);
  if (!title) return null;
  return {
    id: clean(item.id || doi || item.pmid || `${provider}:${slug(title)}`),
    doi,
    provider,
    title,
    abstract,
    url,
    publishedAt,
    query,
    discoveryStatus: 'discovered',
    causalAdmissibility: 'unverified',
    transportability: 'unverified',
    parameterCompleteness: 'unknown',
    interventionTerms: extractTerms(title),
  };
}

function dedupeRecords(records) {
  const map = new Map();
  for (const record of records) {
    const key = record.doi || record.id || `${record.title}`.toLowerCase();
    if (!map.has(key)) map.set(key, record);
  }
  return [...map.values()];
}

async function fetchJson(url, fetchImpl, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (typeof fetchImpl !== 'function') throw new Error('fetch-implementation-required');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { headers: { accept: 'application/json' }, signal: controller.signal });
    if (!response || !response.ok) throw new Error(`evidence-provider-http:${response?.status || 'unknown'}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function pubmedProvider(fetchImpl, options = {}) {
  return {
    id: 'pubmed',
    async search(query) {
      const limit = Number(options.limit || DEFAULT_LIMIT);
      const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=${limit}&term=${encodeURIComponent(query)}`;
      const search = await fetchJson(searchUrl, fetchImpl, options.timeoutMs);
      const ids = search?.esearchresult?.idlist || [];
      if (!ids.length) return [];
      const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`;
      const summary = await fetchJson(summaryUrl, fetchImpl, options.timeoutMs);
      return ids.map(id => {
        const item = summary?.result?.[id] || {};
        return { id: `pubmed:${id}`, pmid: id, title: item.title, publishedAt: item.pubdate, url: `https://pubmed.ncbi.nlm.nih.gov/${id}/` };
      });
    },
  };
}

function crossrefProvider(fetchImpl, options = {}) {
  return {
    id: 'crossref',
    async search(query) {
      const limit = Number(options.limit || DEFAULT_LIMIT);
      const url = `https://api.crossref.org/works?rows=${limit}&query.bibliographic=${encodeURIComponent(query)}&select=DOI,title,URL,published-print,published-online`;
      const body = await fetchJson(url, fetchImpl, options.timeoutMs);
      return (body?.message?.items || []).map(item => ({
        id: item.DOI ? `doi:${item.DOI}` : undefined,
        doi: item.DOI,
        title: Array.isArray(item.title) ? item.title[0] : item.title,
        url: item.URL,
        publishedAt: item['published-print']?.['date-parts']?.[0]?.join('-') || item['published-online']?.['date-parts']?.[0]?.join('-'),
      }));
    },
  };
}

function providerRegistry(fetchImpl, options = {}) {
  return {
    pubmed: pubmedProvider(fetchImpl, options),
    crossref: crossrefProvider(fetchImpl, options),
  };
}

function buildEvidenceGaps(spec, records, candidateNames = []) {
  const text = records.map(record => `${record.title} ${record.abstract}`).join(' ').toLowerCase();
  const gaps = [];
  if (!records.length) gaps.push('no-evidence-records-found');
  if (records.length && !/random|quasi|controlled|cohort|difference-in-differences|natural experiment/.test(text)) {
    gaps.push('causal-design-not-yet-established');
  }
  if (!records.some(record => /cost|resource|budget|staff|implementation/.test(`${record.title} ${record.abstract}`.toLowerCase()))) {
    gaps.push('resource-or-cost-evidence-missing');
  }
  if (!records.some(record => /municipal|city|urban|community|local government/.test(`${record.title} ${record.abstract}`.toLowerCase()))) {
    gaps.push('municipal-setting-transferability-not-established');
  }
  if (candidateNames.length && !candidateNames.some(name => text.includes(clean(name).toLowerCase()))) {
    gaps.push('seed-candidates-not-supported-by-discovered-literature');
  }
  return gaps;
}

async function discoverEvidence({ problem, outcome, population, geography, timeHorizon, seedCandidates = [], providers = DEFAULT_PROVIDERS, fetchImpl = globalThis.fetch, limit = DEFAULT_LIMIT, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const spec = problemSpec(problem, { outcome, population, geography, timeHorizon });
  const plan = buildSearchPlan(spec, seedCandidates);
  const registry = providerRegistry(fetchImpl, { limit, timeoutMs });
  const selected = providers.map(name => registry[name]).filter(Boolean);
  if (!selected.length) throw new Error('no-evidence-providers-selected');

  const records = [];
  const providerErrors = [];
  for (const query of plan.queries) {
    for (const provider of selected) {
      try {
        const found = await provider.search(query);
        for (const item of found) {
          const record = normalizeRecord(provider.id, item, query);
          if (record) records.push(record);
        }
      } catch (error) {
        providerErrors.push({ provider: provider.id, query, error: error.message });
      }
    }
  }

  const deduped = dedupeRecords(records);
  const candidateNames = unique([
    ...seedCandidates.map(item => typeof item === 'string' ? item : item?.name),
    ...deduped.flatMap(record => record.interventionTerms),
  ]);
  return {
    schemaVersion: 'vidik-evidence-discovery.v1',
    status: deduped.length ? 'discovered' : 'insufficient-evidence',
    spec,
    searchPlan: plan,
    candidates: candidateNames.map(name => ({ id: slug(name), name, origin: seedCandidates.some(item => clean(typeof item === 'string' ? item : item?.name).toLowerCase() === name.toLowerCase()) ? 'seed' : 'literature-discovered', admissibility: 'unverified' })),
    records: deduped,
    gaps: buildEvidenceGaps(spec, deduped, seedCandidates.map(item => typeof item === 'string' ? item : item?.name)),
    providerErrors,
    recommendationReady: false,
    note: 'Discovery expands the candidate universe and identifies evidence. It does not manufacture effects, costs, causal admissibility, transportability, or recommendations.',
  };
}

module.exports = {
  problemSpec,
  buildSearchPlan,
  normalizeRecord,
  dedupeRecords,
  buildEvidenceGaps,
  pubmedProvider,
  crossrefProvider,
  discoverEvidence,
};
