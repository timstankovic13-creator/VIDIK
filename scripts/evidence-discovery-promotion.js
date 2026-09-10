'use strict';

/*
 * Promotion boundary between evidence discovery and VIDIK's causal engine.
 * Discovery can expand the candidate universe, but only records that carry
 * the required decision fields and explicit causal/transportability status
 * may cross this boundary. Missing information remains a gap.
 */

const REQUIRED_FIELDS = Object.freeze([
  'intervention',
  'outcome',
  'population',
  'comparator',
  'effect',
  'studyDesign',
  'setting',
  'timeHorizon',
  'resourceOrCost',
  'implementationConditions',
]);

function nonEmpty(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function inspectDiscovery(discovery) {
  if (!discovery || typeof discovery !== 'object') throw new Error('discovery-required');
  const records = Array.isArray(discovery.records) ? discovery.records : [];
  const candidates = Array.isArray(discovery.candidates) ? discovery.candidates : [];

  const promotableRecords = [];
  const gaps = [];

  for (const record of records) {
    const missing = REQUIRED_FIELDS.filter(field => !nonEmpty(record[field]));
    const causal = record.causalAdmissibility === 'admissible';
    const transportable = record.transportability === 'transportable';
    if (!missing.length && causal && transportable) {
      promotableRecords.push(record);
    } else {
      gaps.push({
        recordId: record.id || null,
        missing,
        causalAdmissibility: record.causalAdmissibility || 'unknown',
        transportability: record.transportability || 'unknown',
      });
    }
  }

  return {
    schemaVersion: 'vidik-evidence-promotion-gate.v1',
    candidateCount: candidates.length,
    discoveredRecordCount: records.length,
    promotableRecordCount: promotableRecords.length,
    promotableRecords,
    gaps,
    recommendationReady: false,
    status: promotableRecords.length ? 'causal-review-ready' : 'evidence-insufficient',
  };
}

module.exports = { REQUIRED_FIELDS, inspectDiscovery };
