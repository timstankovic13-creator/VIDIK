'use strict';

function normalizeTags(value) {
  if (Array.isArray(value)) return [...new Set(value.map(String).map(x => x.trim().toLowerCase()).filter(Boolean))];
  return String(value || '').split(/[,;|]/).map(x => x.trim().toLowerCase()).filter(Boolean);
}

function interventionRecordToCandidate(record, source) {
  if (!record || typeof record !== 'object') return null;
  const id = String(record.id || record.interventionId || record.slug || '').trim();
  const name = String(record.name || record.intervention || record.title || '').trim();
  if (!id || !name) return null;
  const problemTags = normalizeTags(record.problemTags || record.problems || record.outcomes || record.targetProblems);
  const domains = normalizeTags(record.domains || record.domain || record.sectors);
  const requiredEvidence = normalizeTags(record.requiredEvidence || record.evidenceTypes || ['causal','implementation','cost','equity']);
  return {
    id,
    name,
    domains,
    problemTags,
    requiredEvidence,
    discovery: {
      source: 'acquired-intervention-universe',
      sourceUrl: source?.url || null,
      datasetId: source?.datasetId || null
    }
  };
}

function extractInterventionCandidates(payload, source = {}) {
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.records) ? payload.records : Array.isArray(payload?.interventions) ? payload.interventions : [];
  const seen = new Set();
  const candidates = [];
  for (const row of rows) {
    const candidate = interventionRecordToCandidate(row, source);
    if (!candidate || seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    candidates.push(candidate);
  }
  return candidates;
}

function mergeInterventionCandidates(...sets) {
  const merged = new Map();
  for (const set of sets) for (const candidate of set || []) {
    if (!candidate?.id) continue;
    const prior = merged.get(candidate.id);
    merged.set(candidate.id, prior ? {
      ...prior,
      ...candidate,
      domains: [...new Set([...(prior.domains || []), ...(candidate.domains || [])])],
      problemTags: [...new Set([...(prior.problemTags || []), ...(candidate.problemTags || [])])],
      requiredEvidence: [...new Set([...(prior.requiredEvidence || []), ...(candidate.requiredEvidence || [])])],
      discovery: { ...(prior.discovery || {}), ...(candidate.discovery || {}) }
    } : candidate);
  }
  return [...merged.values()].sort((a,b) => a.id.localeCompare(b.id));
}

module.exports = { normalizeTags, interventionRecordToCandidate, extractInterventionCandidates, mergeInterventionCandidates };
