'use strict';

const crypto = require('crypto');

const EVIDENCE_CLASSES = Object.freeze(['causal', 'comparative', 'implementation', 'cost', 'equity', 'safety']);

// This registry is a fallback vocabulary, never the authoritative intervention universe.
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

function normalizeProblemTags(problem) {
  const text = String(problem || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
  const aliases = new Map([
    ['crime', 'violent-crime'], ['violence', 'violent-crime'], ['shooting', 'shootings'], ['shootings', 'shootings'],
    ['homeless', 'homelessness'], ['homelessness', 'homelessness'], ['housing', 'housing-instability'],
    ['speed', 'speeding'], ['traffic', 'traffic-injury'], ['ems', 'ems-demand'], ['paramedic', 'ems-demand'],
    ['heat', 'extreme-heat'], ['emissions', 'emissions']
  ]);
  return [...new Set(text.split(/\s+/).filter(Boolean).map(token => aliases.get(token) || token))];
}

function slugify(value) {
  return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
}

function candidateFromRecord(record, problem) {
  if (!record || typeof record !== 'object') return null;
  const name = record.id || record.name || record.title || record.intervention || record.program || record.service;
  if (!name) return null;
  const tags = record.problemTags || record.tags || record.problems || record.objectives || [];
  const problemTags = Array.isArray(tags) ? tags.map(slugify).filter(Boolean) : [slugify(tags)];
  const textTags = normalizeProblemTags(problem);
  const derivedTags = [...new Set([...problemTags, ...textTags.filter(tag => String(name).toLowerCase().includes(tag.replace(/-/g, ' ')))])];
  return {
    id: slugify(record.interventionId || name),
    name: String(name),
    domains: Array.isArray(record.domains) ? record.domains : (record.domain ? [record.domain] : ['unknown']),
    problemTags: derivedTags,
    requiredEvidence: Array.isArray(record.requiredEvidence) && record.requiredEvidence.length ? record.requiredEvidence : [...EVIDENCE_CLASSES.slice(0, 4)],
    discovery: { source: 'acquired-intervention-universe', sourceRecordId: record.id || null, provenance: record.source || null },
    acquisitionRecordId: record.acquisitionRecordId || null
  };
}

function extractInterventionCandidates(payload, { problem, sourceRecordId = null } = {}) {
  const root = payload?.value ?? payload;
  const rows = Array.isArray(root) ? root
    : Array.isArray(root?.interventions) ? root.interventions
      : Array.isArray(root?.programs) ? root.programs
        : Array.isArray(root?.services) ? root.services
          : Array.isArray(root?.data) ? root.data
            : [];
  return rows.map(row => candidateFromRecord(row, problem)).filter(Boolean).map(candidate => ({ ...candidate, acquisitionRecordId: candidate.acquisitionRecordId || sourceRecordId }));
}

function discoverInterventions({ problem, candidates = CANDIDATE_REGISTRY, evidenceIndex = {}, localProgramIndex = [], acquiredCandidates = [] } = {}) {
  if (!problem) throw new Error('intervention-discovery-problem-required');
  const tags = normalizeProblemTags(problem);
  const registry = [...acquiredCandidates, ...localProgramIndex, ...candidates];
  const seen = new Set();
  const results = [];
  for (const candidate of registry) {
    if (!candidate?.id || seen.has(candidate.id)) continue;
    const candidateTags = Array.isArray(candidate.problemTags) ? candidate.problemTags : [];
    const matchScore = candidateTags.reduce((score, tag) => score + (tags.includes(tag) ? 1 : 0), 0);
    if (!matchScore) continue;
    seen.add(candidate.id);
    const evidence = evidenceIndex[candidate.id] || {};
    const missingEvidence = candidate.requiredEvidence.filter(type => !evidence[type] || evidence[type].status === 'blocked');
    results.push({
      id: candidate.id,
      name: candidate.name || candidate.id,
      domains: candidate.domains,
      problemTags: candidateTags,
      discovery: candidate.discovery || { source: 'VIDIK-candidate-registry', matchScore },
      requiredEvidence: candidate.requiredEvidence,
      evidence,
      evidenceState: missingEvidence.length ? 'evidence-gap' : 'evidence-complete',
      missingEvidence
    });
  }
  return results.sort((a, b) => b.discovery.matchScore - a.discovery.matchScore || b.discovery.source === 'acquired-intervention-universe' ? 1 : a.id.localeCompare(b.id));
}

function evidenceCoverage(candidates) {
  const total = candidates.length;
  const complete = candidates.filter(candidate => candidate.evidenceState === 'evidence-complete').length;
  return { total, complete, withEvidenceGaps: total - complete, coverageRate: total ? complete / total : 0 };
}

function hashCandidateUniverse(candidates) {
  return crypto.createHash('sha256').update(JSON.stringify(candidates)).digest('hex');
}

module.exports = { EVIDENCE_CLASSES, CANDIDATE_REGISTRY, normalizeProblemTags, slugify, candidateFromRecord, extractInterventionCandidates, discoverInterventions, evidenceCoverage, hashCandidateUniverse };
