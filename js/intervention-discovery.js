'use strict';

const crypto = require('crypto');

const EVIDENCE_CLASSES = Object.freeze(['causal', 'comparative', 'implementation', 'cost', 'equity', 'safety']);

// Descriptive fallback vocabulary only. Acquired/local candidates are evaluated first.
const CANDIDATE_REGISTRY = Object.freeze([
  { id: 'housing-first-supportive-housing', domains: ['housing'], problemTags: ['homelessness', 'chronic-homelessness', 'housing-instability'], requiredEvidence: ['causal', 'implementation', 'cost', 'equity'] },
  { id: 'rapid-rehousing', domains: ['housing'], problemTags: ['homelessness', 'housing-instability'], requiredEvidence: ['causal', 'implementation', 'cost', 'equity'] },
  { id: 'permanent-supportive-housing', domains: ['housing'], problemTags: ['homelessness', 'chronic-homelessness'], requiredEvidence: ['causal', 'implementation', 'cost', 'equity'] },
  { id: 'rent-subsidy-housing-stability', domains: ['housing'], problemTags: ['housing-instability', 'eviction'], requiredEvidence: ['causal', 'implementation', 'cost', 'equity'] },
  { id: 'automated-speed-enforcement', domains: ['public-safety', 'transport'], problemTags: ['traffic-injury', 'road-safety', 'speeding'], requiredEvidence: ['causal', 'implementation', 'cost', 'safety', 'equity'] },
  { id: 'traffic-calming', domains: ['public-safety', 'transport'], problemTags: ['traffic-injury', 'road-safety', 'speeding'], requiredEvidence: ['causal', 'implementation', 'cost', 'safety'] },
  { id: 'safe-routes-street-redesign', domains: ['public-safety', 'transport'], problemTags: ['traffic-injury', 'pedestrian-safety', 'road-safety'], requiredEvidence: ['causal', 'implementation', 'cost', 'equity', 'safety'] },
  { id: 'violence-interruption', domains: ['public-safety', 'health'], problemTags: ['violent-crime', 'shootings', 'community-violence'], requiredEvidence: ['causal', 'implementation', 'cost', 'equity', 'safety'] },
  { id: 'focused-deterrence', domains: ['public-safety'], problemTags: ['violent-crime', 'gun-violence', 'repeat-violence'], requiredEvidence: ['causal', 'implementation', 'cost', 'equity', 'safety'] },
  { id: 'place-based-vacant-lot-intervention', domains: ['public-safety', 'environment'], problemTags: ['violent-crime', 'property-crime', 'neighbourhood-disorder'], requiredEvidence: ['causal', 'implementation', 'cost', 'equity'] },
  { id: 'youth-employment-program', domains: ['public-safety', 'employment'], problemTags: ['violent-crime', 'youth-violence', 'youth-unemployment'], requiredEvidence: ['causal', 'implementation', 'cost', 'equity'] },
  { id: 'additional-paramedic-capacity', domains: ['health'], problemTags: ['ems-response', 'overcrowding', 'emergency-response'], requiredEvidence: ['causal', 'implementation', 'cost', 'safety'] },
  { id: 'community-paramedicine', domains: ['health'], problemTags: ['ems-demand', 'avoidable-emergency-department-use'], requiredEvidence: ['causal', 'implementation', 'cost', 'equity'] },
  { id: 'mobile-crisis-response', domains: ['health', 'public-safety'], problemTags: ['mental-health-crisis', 'ems-demand', 'police-demand'], requiredEvidence: ['causal', 'implementation', 'cost', 'safety', 'equity'] },
  { id: 'cool-roof-tree-canopy', domains: ['environment', 'health'], problemTags: ['extreme-heat', 'urban-heat'], requiredEvidence: ['causal', 'implementation', 'cost', 'equity'] },
  { id: 'building-energy-retrofits', domains: ['environment', 'housing'], problemTags: ['energy-use', 'emissions', 'energy-poverty'], requiredEvidence: ['causal', 'implementation', 'cost', 'equity'] }
]);

const STOP_WORDS = new Set(['a','an','and','are','for','from','in','into','of','on','or','reduce','reducing','the','to','with','improve','improving','increase','increasing','decrease','decreasing']);

function normalizeProblemTags(problem) {
  const text = String(problem || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
  const aliases = new Map([
    ['crime', 'violent-crime'], ['violence', 'violent-crime'], ['violent', 'violent-crime'], ['shooting', 'shootings'], ['shootings', 'shootings'],
    ['homeless', 'homelessness'], ['homelessness', 'homelessness'], ['housing', 'housing-instability'],
    ['speed', 'speeding'], ['traffic', 'traffic-injury'], ['ems', 'ems-demand'], ['paramedic', 'ems-demand'],
    ['heat', 'extreme-heat'], ['emissions', 'emissions'], ['emergency-department', 'emergency-department'],
    ['overcrowded', 'overcrowding'], ['overcrowding', 'overcrowding']
  ]);
  return [...new Set(text.split(/\s+/).filter(Boolean).map(token => aliases.get(token) || token))];
}

function discoveryTokens(text) {
  return new Set(String(text || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(token => token && !STOP_WORDS.has(token)));
}

function candidateMatch(candidate, problemTags, problemText) {
  const candidateTags = Array.isArray(candidate.problemTags) ? candidate.problemTags : [];
  const tagMatches = candidateTags.filter(tag => problemTags.includes(tag));
  const problemTokens = discoveryTokens(problemText).size ? discoveryTokens(problemText) : new Set(problemTags);
  const text = `${candidate.name || ''} ${candidate.discoveryText || ''} ${(candidate.domains || []).join(' ')} ${candidateTags.join(' ')}`;
  const textMatches = [...discoveryTokens(text)].filter(token => problemTokens.has(token));
  const aliasMatches = candidateTags.filter(tag => problemTags.includes(tag));
  return { matchScore: tagMatches.length * 3 + textMatches.length, matchedProblemSignals: [...new Set([...aliasMatches, ...textMatches])], candidateTags };
}

function discoverInterventions({ problem, candidates = CANDIDATE_REGISTRY, evidenceIndex = {}, localProgramIndex = [], acquiredCandidates = [] } = {}) {
  if (!problem) throw new Error('intervention-discovery-problem-required');
  const tags = normalizeProblemTags(problem);
  const registry = [...acquiredCandidates, ...localProgramIndex, ...candidates];
  const seen = new Set();
  const results = [];
  for (const candidate of registry) {
    if (!candidate?.id || seen.has(candidate.id)) continue;
    const match = candidateMatch(candidate, tags, problem);
    if (!match.matchScore) continue;
    seen.add(candidate.id);
    const evidence = evidenceIndex[candidate.id] || {};
    const missingEvidence = (candidate.requiredEvidence || []).filter(type => !evidence[type] || evidence[type].status === 'blocked');
    results.push({
      id: candidate.id,
      name: candidate.name || candidate.id,
      domains: candidate.domains || [],
      problemTags: match.candidateTags,
      discovery: { ...(candidate.discovery || { source: 'VIDIK-candidate-registry' }), matchScore: match.matchScore, matchedProblemSignals: match.matchedProblemSignals },
      requiredEvidence: candidate.requiredEvidence || [],
      evidence,
      evidenceState: missingEvidence.length ? 'evidence-gap' : 'evidence-complete',
      missingEvidence
    });
  }
  return results.sort((a, b) => b.discovery.matchScore - a.discovery.matchScore || (a.discovery.source === 'acquired-intervention-universe' ? -1 : b.discovery.source === 'acquired-intervention-universe' ? 1 : a.id.localeCompare(b.id)));
}

function evidenceCoverage(candidates) {
  const total = candidates.length;
  const complete = candidates.filter(candidate => candidate.evidenceState === 'evidence-complete').length;
  return { total, complete, withEvidenceGaps: total - complete, coverageRate: total ? complete / total : 0 };
}

function hashCandidateUniverse(candidates) {
  return crypto.createHash('sha256').update(JSON.stringify(candidates)).digest('hex');
}

module.exports = { EVIDENCE_CLASSES, CANDIDATE_REGISTRY, normalizeProblemTags, discoveryTokens, candidateMatch, discoverInterventions, evidenceCoverage, hashCandidateUniverse };
