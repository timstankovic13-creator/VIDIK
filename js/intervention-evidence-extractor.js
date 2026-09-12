'use strict';

function normalizeTags(value) {
  if (Array.isArray(value)) return [...new Set(value.map(String).map(x => x.trim().toLowerCase()).filter(Boolean))];
  return String(value || '').split(/[,;|]/).map(x => x.trim().toLowerCase()).filter(Boolean);
}

function candidateRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const direct = ['records','interventions','programs','services','items','results','data','features'];
  for (const key of direct) if (Array.isArray(payload[key])) return payload[key];
  if (Array.isArray(payload.result?.results)) return payload.result.results;
  if (Array.isArray(payload.result?.records)) return payload.result.records;
  if (Array.isArray(payload.data?.results)) return payload.data.results;
  return [];
}

function unwrapRecord(record) {
  if (!record || typeof record !== 'object') return null;
  if (record.attributes && typeof record.attributes === 'object') return { ...record, ...record.attributes };
  if (record.fields && typeof record.fields === 'object') return { ...record, ...record.fields };
  return record;
}

function interventionRecordToCandidate(record, source) {
  const row = unwrapRecord(record);
  if (!row) return null;
  const id = String(row.id || row.interventionId || row.programId || row.serviceId || row.slug || row.identifier || '').trim();
  const name = String(row.name || row.intervention || row.program || row.service || row.title || row.label || '').trim();
  if (!id || !name) return null;
  const problemTags = normalizeTags(row.problemTags || row.problems || row.outcomes || row.targetProblems || row.tags || row.keywords);
  const domains = normalizeTags(row.domains || row.domain || row.sectors || row.categories || row.category);
  const requiredEvidence = normalizeTags(row.requiredEvidence || row.evidenceTypes || ['causal','implementation','cost','equity']);
  return {
    id,
    name,
    domains,
    problemTags,
    requiredEvidence,
    discovery: {
      source: 'acquired-intervention-universe',
      sourceUrl: source?.url || null,
      datasetId: source?.datasetId || source?.sourceId || null,
      extractionMethod: source?.extractionMethod || 'generic-intervention-record'
    }
  };
}

function extractInterventionCandidates(payload, source = {}) {
  const rows = candidateRows(payload);
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

module.exports = { normalizeTags, candidateRows, interventionRecordToCandidate, extractInterventionCandidates, mergeInterventionCandidates };
