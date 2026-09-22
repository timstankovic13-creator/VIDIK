'use strict';

const { buildEvidenceEnvelope } = require('./municipal-ingestion');

function finiteNumber(value, field) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`non-finite-parameter:${field}`);
  return number;
}

function selectNumericValues(records, field) {
  if (!Array.isArray(records) || records.length === 0) throw new Error('no-evidence-records');
  const values = records.map((record, index) => {
    if (!record || typeof record !== 'object') throw new Error(`invalid-evidence-record:${index}`);
    return finiteNumber(record[field], `${field}:${index}`);
  });
  if (!values.length) throw new Error(`empty-parameter:${field}`);
  return values;
}

function aggregate(values, method = 'mean') {
  if (!Array.isArray(values) || !values.length) throw new Error('empty-aggregation-input');
  if (method === 'sum') return values.reduce((total, value) => total + value, 0);
  if (method === 'mean') return values.reduce((total, value) => total + value, 0) / values.length;
  if (method === 'min') return Math.min(...values);
  if (method === 'max') return Math.max(...values);
  throw new Error(`unsupported-aggregation:${method}`);
}

function buildEvidenceClaim(envelope, mapping) {
  if (!envelope || envelope.status !== 'validated') throw new Error('evidence-not-validated');
  if (!mapping || typeof mapping !== 'object') throw new Error('parameter-mapping-required');
  const field = String(mapping.field || '').trim();
  const parameterName = String(mapping.parameterName || '').trim();
  if (!field || !parameterName) throw new Error('parameter-mapping-incomplete');

  const values = selectNumericValues(envelope.evidence.records, field);
  const value = aggregate(values, mapping.aggregation || 'mean');
  const transform = mapping.transform;
  const transformed = typeof transform === 'function' ? finiteNumber(transform(value), parameterName) : value;

  return {
    schemaVersion: 'municipal-evidence-claim.v1',
    parameter: {
      name: parameterName,
      value: transformed,
      unit: String(mapping.unit || 'unspecified'),
      aggregation: mapping.aggregation || 'mean',
      source: envelope.city,
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
  aggregate,
  buildEvidenceClaim,
  buildDecisionInput,
  buildMunicipalDecision,
};
