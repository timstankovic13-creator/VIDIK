'use strict';

const { buildEvidenceEnvelope } = require('./municipal-ingestion');

function finiteNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`non-finite-parameter:${field}`);
  return number;
}

function getFieldValue(record, field) {
  if (Object.prototype.hasOwnProperty.call(record, field)) return record[field];
  return String(field).split('.').reduce((value, key) => {
    if (value === null || value === undefined || typeof value !== 'object') return undefined;
    return value[key];
  }, record);
}

function selectNumericValues(records, field) {
  if (!Array.isArray(records) || records.length === 0) throw new Error('no-evidence-records');
  return records.map((record, index) => {
    if (!record || typeof record !== 'object') throw new Error(`invalid-evidence-record:${index}`);
    return finiteNumber(getFieldValue(record, field), `${field}:${index}`);
  });
}

function selectCategoryValues(records, field) {
  if (!Array.isArray(records) || records.length === 0) throw new Error('no-evidence-records');
  return records.map((record, index) => {
    if (!record || typeof record !== 'object') throw new Error(`invalid-evidence-record:${index}`);
    const value = getFieldValue(record, field);
    if (value === undefined || value === null || String(value).trim() === '') throw new Error(`missing-category:${field}:${index}`);
    return String(value).trim();
  });
}

function aggregate(values, method = 'mean', options = {}) {
  if (!Array.isArray(values) || !values.length) throw new Error('empty-aggregation-input');
  if (method === 'sum') return values.reduce((total, value) => total + value, 0);
  if (method === 'mean') return values.reduce((total, value) => total + value, 0) / values.length;
  if (method === 'min') return Math.min(...values);
  if (method === 'max') return Math.max(...values);
  if (method === 'category-rate') {
    const positives = new Set((options.categoryValues || []).map(value => String(value).toLowerCase()));
    if (!positives.size) throw new Error('category-values-required');
    return values.filter(value => positives.has(String(value).toLowerCase())).length / values.length;
  }
  throw new Error(`unsupported-aggregation:${method}`);
}

function buildEvidenceClaim(envelope, mapping) {
  if (!envelope || envelope.status !== 'validated') throw new Error('evidence-not-validated');
  if (!mapping || typeof mapping !== 'object') throw new Error('parameter-mapping-required');
  const field = String(mapping.field || '').trim();
  const parameterName = String(mapping.parameterName || '').trim();
  if (!field || !parameterName) throw new Error('parameter-mapping-incomplete');
  if (mapping.causalEligible === false && mapping.role !== 'context') throw new Error('invalid-context-mapping');

  const aggregationMethod = mapping.aggregation || 'mean';
  const values = aggregationMethod === 'category-rate'
    ? selectCategoryValues(envelope.evidence.records, field)
    : selectNumericValues(envelope.evidence.records, field);
  const value = aggregate(values, aggregationMethod, mapping);
  const transform = mapping.transform;
  const transformed = typeof transform === 'function' ? finiteNumber(transform(value), parameterName) : finiteNumber(value, parameterName);

  return {
    schemaVersion: 'municipal-evidence-claim.v1',
    parameter: {
      name: parameterName,
      value: transformed,
      unit: String(mapping.unit || 'unspecified'),
      aggregation: aggregationMethod,
      source: envelope.city,
      role: mapping.role || 'unspecified',
      causalEligible: mapping.causalEligible === true,
      semantic: String(mapping.semantic || ''),
    },
    evidence: {
      schemaVersion: envelope.schemaVersion,
      city: envelope.city,
      datasetId: envelope.source.datasetId,
      sourceUrl: envelope.source.sourceUrl,
      normalizedSha256: envelope.evidence.normalizedSha256,
      retrievedAt: envelope.evidence.retrievedAt,
      recordCount: envelope.evidence.recordCount,
      freshness: envelope.freshness,
    },
    status: 'validated',
  };
}

function buildDecisionInput(claim, model) {
  if (!claim || claim.status !== 'validated') throw new Error('claim-not-validated');
  if (!model || typeof model !== 'object') throw new Error('model-required');
  const parameters = { [claim.parameter.name]: claim.parameter.value };
  const input = {
    schemaVersion: 'municipal-decision-input.v1',
    geography: claim.parameter.source,
    parameters,
    evidence: claim.evidence,
    parameterLineage: {
      role: claim.parameter.role,
      causalEligible: claim.parameter.causalEligible,
      semantic: claim.parameter.semantic,
    },
  };
  return {
    ...input,
    recommendation: typeof model.recommend === 'function' ? model.recommend(input) : null,
    modelId: String(model.modelId || 'unidentified'),
  };
}

function buildMunicipalDecision({ city, ingestion, mapping, model, now = new Date(), maxAgeHours } = {}) {
  const envelope = buildEvidenceEnvelope({ city, ingestion, now, maxAgeHours });
  const claim = buildEvidenceClaim(envelope, mapping);
  return { envelope, claim, decisionInput: buildDecisionInput(claim, model) };
}

module.exports = {
  finiteNumber,
  selectNumericValues,
  selectCategoryValues,
  aggregate,
  buildEvidenceClaim,
  buildDecisionInput,
  buildMunicipalDecision,
};
