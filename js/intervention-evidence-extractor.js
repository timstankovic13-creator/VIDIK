'use strict';

function normalizeTags(value) {
  if (Array.isArray(value)) return [...new Set(value.map(String).map(x => x.trim().toLowerCase()).filter(Boolean))];
  return [...new Set(String(value || '').split(/[,;|]/).map(x => x.trim().toLowerCase()).filter(Boolean))];
}

const INTERVENTION_TYPE_FIELDS = ['type', 'recordType', 'interventionType', 'programType', 'serviceType', 'resourceType', 'kind'];
const INTERVENTION_TYPE_VALUES = new Set(['intervention', 'program', 'service', 'policy', 'practice', 'initiative', 'treatment', 'strategy', 'measure', 'project']);
const TEXT_FIELDS = ['name', 'intervention', 'program', 'service', 'title', 'label', 'description', 'summary', 'purpose', 'objective', 'activities', 'keywords'];

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

function semanticText(row) {
  return TEXT_FIELDS.flatMap(field => {
    const value = row[field];
    return Array.isArray(value) ? value : value == null ? [] : [value];
  }).map(String).join(' ').trim();
}

function interventionSignals(row, source = {}) {
  const explicitTypes = INTERVENTION_TYPE_FIELDS.flatMap(field => normalizeTags(row[field])).filter(Boolean);
  const semanticTypes = explicitTypes.filter(type => INTERVENTION_TYPE_VALUES.has(type.replace(/_/g, '-')));
  const sourceDeclared = source?.domain === 'intervention-universe' || source?.recordType === 'intervention-catalog' || source?.declaresInterventions === true;
  const signals = [];
  if (semanticTypes.length) signals.push('record-intervention-type');
  if (sourceDeclared) signals.push('source-declared-intervention-universe');
  if (row.description || row.summary || row.purpose || row.activities) signals.push('intervention-description');
  return { signals: [...new Set(signals)], explicitTypes: [...new Set(explicitTypes)], sourceDeclared };
}

function interventionRecordToCandidate(record, source) {
  const row = unwrapRecord(record);
  if (!row) return { candidate: null, rejection: { reason: 'invalid-record' } };
  const id = String(row.id || row.interventionId || row.programId || row.serviceId || row.slug || row.identifier || '').trim();
  const name = String(row.name || row.intervention || row.program || row.service || row.title || row.label || '').trim();
  if (!id) return { candidate: null, rejection: { reason: 'missing-intervention-id' } };
  if (!name) return { candidate: null, rejection: { reason: 'missing-intervention-name', id } };

  const signals = interventionSignals(row, source);
  if (!signals.signals.length) {
    return { candidate: null, rejection: { reason: 'missing-intervention-semantic', id, name, sourceUrl: source?.url || null } };
  }

  const problemTags = normalizeTags(row.problemTags || row.problems || row.outcomes || row.targetProblems || row.tags || row.keywords);
  const domains = normalizeTags(row.domains || row.domain || row.sectors || row.categories || row.category);
  const requiredEvidence = normalizeTags(row.requiredEvidence || row.evidenceTypes || ['causal','implementation','cost','equity']);
  return { candidate: {
    id,
    name,
    domains,
    problemTags,
    discoveryText: semanticText(row),
    requiredEvidence,
    discovery: {
      source: 'acquired-intervention-universe',
      sourceUrl: source?.url || null,
      datasetId: source?.datasetId || source?.sourceId || null,
      extractionMethod: source?.extractionMethod || 'generic-intervention-record',
      admission: signals.sourceDeclared ? 'source-declared-intervention-universe' : 'record-semantic',
      discoverySignals: signals.signals,
      explicitTypes: signals.explicitTypes
    }
  }, rejection: null };
}

function extractInterventionCandidatesDetailed(payload, source = {}) {
  const rows = candidateRows(payload);
  const seen = new Set();
  const candidates = [];
  const rejections = [];
  for (const row of rows) {
    const result = interventionRecordToCandidate(row, source);
    if (result.rejection) {
      rejections.push(result.rejection);
      continue;
    }
    const candidate = result.candidate;
    if (seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    candidates.push(candidate);
  }
  return { candidates, rejections, scannedRecords: rows.length };
}

function extractInterventionCandidates(payload, source = {}) {
  return extractInterventionCandidatesDetailed(payload, source).candidates;
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
      discoveryText: [...new Set([prior.discoveryText, candidate.discoveryText].filter(Boolean))].join(' '),
      discovery: { ...(prior.discovery || {}), ...(candidate.discovery || {}) }
    } : candidate);
  }
  return [...merged.values()].sort((a,b) => a.id.localeCompare(b.id));
}

module.exports = { normalizeTags, candidateRows, unwrapRecord, semanticText, interventionSignals, interventionRecordToCandidate, extractInterventionCandidatesDetailed, extractInterventionCandidates, mergeInterventionCandidates };
