'use strict';

const text = x => String(x ?? '').trim();
const clean = x => text(x).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

const VOCABULARY = {
  crime:['crime','violent','violence','assault','robbery','homicide','policing','justice','safety'],
  flood:['flood','flooding','stormwater','drainage','rain','resilience'],
  opioid:['opioid','overdose','drug','substance','addiction'],
  housing:['housing','homeless','shelter','rent','tenancy','supportive housing'],
  road:['road','traffic','collision','crash','speed','pedestrian','cycling','transport'],
  employment:['employment','unemployment','job','workforce','labour','labor'],
  health:['health','mortality','disease','hospital','mental health','public health'],
  education:['education','school','student','learning'],
  environment:['environment','climate','emission','air quality','waste','water'],
  business:['business','enterprise','productivity','small business','innovation']
};

function expandProblem(problem, extraVocabulary = {}) {
  const base = clean(problem).toLowerCase().split(/[^a-z0-9]+/).filter(x => x.length > 2);
  const vocabulary = {...VOCABULARY, ...extraVocabulary};
  const expanded = [...base];
  for (const terms of Object.values(vocabulary)) {
    if (terms.some(term => base.includes(term) || clean(problem).toLowerCase().includes(term))) expanded.push(...terms);
  }
  return [...new Set(expanded)].slice(0, 80);
}

function relevance(record, terms) {
  const haystack = clean([record.title, record.name, record.description, record.notes, ...(record.tags || [])].join(' ')).toLowerCase();
  if (!haystack || !terms.length) return 0;
  const hits = terms.filter(term => haystack.includes(term)).length;
  return Math.min(1, hits / Math.max(3, Math.sqrt(terms.length)));
}

function candidateUniverse(problem, records = [], options = {}) {
  const terms = expandProblem(problem, options.vocabulary);
  const rows = Array.isArray(records) ? records : [];
  const candidates = [];
  const failures = [];
  let considered = 0;
  for (const [index, record] of rows.entries()) {
    considered += 1;
    const sourceId = text(record.sourceId || record.source?.id);
    const name = clean(record.title || record.name);
    if (!sourceId || !name) {
      failures.push({index, reason:'candidate-provenance-or-name-missing'});
      continue;
    }
    const score = relevance(record, terms);
    if (score < (Number.isFinite(Number(options.minRelevance)) ? Number(options.minRelevance) : 0.05)) continue;
    candidates.push({
      id: text(record.id) || `lead:${sourceId}:${index}`,
      name,
      description: clean(record.description || record.notes),
      sourceId,
      jurisdiction: text(record.jurisdiction) || 'unknown',
      relevance: score,
      discoveryOnly: true,
      leadOnly: true,
      evidenceStatus: 'potential',
      effectsImported: false,
      causalEffectImported: false
    });
  }
  const deduped = new Map();
  for (const candidate of candidates) {
    const key = candidate.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!deduped.has(key) || candidate.relevance > deduped.get(key).relevance) deduped.set(key, candidate);
  }
  const universe = [...deduped.values()].sort((a,b) => b.relevance-a.relevance || a.id.localeCompare(b.id));
  return {
    schemaVersion:'vidik.intervention-universe.v1',
    problem:clean(problem),
    problemTerms:terms,
    considered,
    matched:universe.length,
    unmatched:Math.max(0, considered - candidates.length),
    provenanceGaps:failures.length,
    candidates:universe.slice(0, Number.isInteger(options.limit) && options.limit > 0 ? options.limit : 100),
    failures,
    recommendationAllowed:false,
    effectsImported:false,
    rule:'Discovery creates leads only. No discovery record is a causal effect, verified parameter, or recommendation.'
  };
}

module.exports = { expandProblem, relevance, candidateUniverse };
