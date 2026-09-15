'use strict';

const DOMAIN_TERMS = {
  crime: ['crime','violent','violence','assault','robbery','homicide','policing','justice','safety'],
  flood: ['flood','flooding','stormwater','drainage','rain','resilience'],
  opioid: ['opioid','overdose','drug','substance','addiction'],
  housing: ['housing','homeless','shelter','rent','tenancy','supportive housing'],
  road: ['road','traffic','collision','crash','speed','pedestrian','cycling','transport'],
  employment: ['employment','unemployment','job','workforce','labour','labor','worker'],
  health: ['health','mortality','disease','hospital','mental health','public health'],
  education: ['education','school','student','learning'],
  environment: ['environment','climate','emission','air quality','waste','water'],
  business: ['business','enterprise','productivity','small business','innovation']
};

const GENERIC = new Set(['data','dataset','report','statistics','program','policy','government','public','city','municipal','service']);

function clean(value) {
  return String(value ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function termsForProblem(problem) {
  const base = clean(problem).split(/[^a-z0-9]+/).filter(t => t.length > 2);
  const expanded = [];
  for (const terms of Object.values(DOMAIN_TERMS)) {
    if (terms.some(t => base.includes(t))) expanded.push(...terms);
  }
  return [...new Set([...base, ...expanded])];
}

function scoreCandidate(problem, candidate = {}) {
  const title = clean(candidate.name || candidate.title);
  const body = clean([candidate.description, candidate.notes, candidate.tags].filter(Boolean).join(' '));
  const text = `${title} ${body}`;
  const terms = termsForProblem(problem);
  const titleHits = terms.filter(t => title.includes(t));
  const bodyHits = terms.filter(t => body.includes(t));
  const matchedTerms = [...new Set([...titleHits, ...bodyHits])];
  const meaningfulHits = matchedTerms.filter(t => !GENERIC.has(t));
  const exactProblemHits = clean(problem).split(/[^a-z0-9]+/).filter(t => t.length > 2 && !GENERIC.has(t) && text.includes(t));
  const score = Math.min(1, (titleHits.length * 0.22) + (bodyHits.length * 0.06) + (exactProblemHits.length * 0.12));
  const tier = score >= 0.45 ? 'direct' : score >= 0.18 ? 'related' : score > 0 ? 'weak' : 'unrelated';
  return { score: Number(score.toFixed(4)), tier, matchedTerms: meaningfulHits, titleHits, bodyHits };
}

function rankCandidates(problem, candidates = [], options = {}) {
  const minScore = Number.isFinite(options.minScore) ? options.minScore : 0.08;
  return candidates.map(candidate => ({ ...candidate, relevance: scoreCandidate(problem, candidate) }))
    .filter(candidate => candidate.relevance.score >= minScore)
    .sort((a, b) => b.relevance.score - a.relevance.score || String(a.name || a.title).localeCompare(String(b.name || b.title)));
}

module.exports = { DOMAIN_TERMS, termsForProblem, scoreCandidate, rankCandidates };
