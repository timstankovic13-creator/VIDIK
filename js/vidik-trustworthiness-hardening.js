'use strict';

const crypto = require('node:crypto');

const TRUSTED_EVIDENCE_STATUSES = new Set(['verified', 'supported', 'admissible', 'evidence-complete']);
const FAILURE_STATUSES = new Set(['failed', 'search-failed', 'error', 'blocked']);

function finite(value) {
  return Number.isFinite(Number(value));
}

function canonicalEvidenceIds(ids = []) {
  if (!Array.isArray(ids)) return { valid: false, ids: [], reason: 'evidence-ids-must-be-array' };
  const normalized = ids.map(String);
  if (new Set(normalized).size !== normalized.length) return { valid: false, ids: normalized, reason: 'duplicate-evidence-ids' };
  return { valid: true, ids: normalized };
}

function evidenceIntegrity({ evidenceIds = [], evidenceIndex = {}, jurisdiction = null, now = Date.now(), maxAgeDays = 365 } = {}) {
  const ids = canonicalEvidenceIds(evidenceIds);
  const failures = ids.valid ? [] : [ids.reason];
  const records = [];
  for (const id of ids.ids) {
    const record = evidenceIndex[id];
    if (!record) {
      failures.push(`evidence-not-found:${id}`);
      continue;
    }
    const status = String(record.status || record.evidenceStatus || '').toLowerCase();
    if (!TRUSTED_EVIDENCE_STATUSES.has(status)) failures.push(`evidence-not-trusted:${id}`);
    if (jurisdiction && record.jurisdiction && record.jurisdiction !== jurisdiction) failures.push(`evidence-wrong-jurisdiction:${id}`);
    if (record.effectsImported === true) failures.push(`causal-effects-imported:${id}`);
    const retrievedAt = record.retrievedAt || record.publishedAt || null;
    if (retrievedAt && maxAgeDays >= 0) {
      const ageMs = now - Date.parse(retrievedAt);
      if (Number.isFinite(ageMs) && ageMs > maxAgeDays * 86400000) failures.push(`evidence-stale:${id}`);
    }
    records.push({ id, status, jurisdiction: record.jurisdiction || null, retrievedAt });
  }
  return { admissible: failures.length === 0 && ids.valid && ids.ids.length > 0, failures, records };
}

function validateResourceCompatibility(resourceUnit, modelUnit) {
  const expected = String(resourceUnit || '').trim().toUpperCase();
  const actual = String(modelUnit || '').trim().toUpperCase();
  if (!expected || !actual) return { compatible: false, reason: 'resource-unit-unspecified' };
  return { compatible: expected === actual, reason: expected === actual ? null : `resource-unit-mismatch:${expected}:${actual}` };
}

function validateMarginalChain(model, { resourceUnit = null, evidenceIndex = {}, jurisdiction = null, now = Date.now(), maxAgeDays = 365 } = {}) {
  if (!model) return { admissible: false, failures: ['marginal-resource-model-missing'] };
  const failures = [];
  for (const key of ['capacityPerResource', 'activityPerCapacity', 'effectPerActivity', 'objectiveMetric']) {
    if (key === 'objectiveMetric') { if (typeof model[key] !== 'string' || !model[key].trim()) failures.push(`${key}-missing-or-invalid`); }
    else if (!finite(model[key]) || Number(model[key]) <= 0) failures.push(`${key}-missing-or-invalid`);
  }
  const compatibility = validateResourceCompatibility(resourceUnit, model.resourceUnit || model.currencyUnit);
  if (!compatibility.compatible) failures.push(compatibility.reason);
  const evidence = evidenceIntegrity({ evidenceIds: model.evidenceIds, evidenceIndex, jurisdiction, now, maxAgeDays });
  failures.push(...evidence.failures);
  return { admissible: failures.length === 0, failures, evidence, compatibility };
}

function normalizeSourceOutage(sources = []) {
  const normalized = sources.map(source => ({ ...source, status: FAILURE_STATUSES.has(source.status) ? 'failed' : source.status || 'available' }));
  const available = normalized.filter(source => source.status !== 'failed');
  const failed = normalized.filter(source => source.status === 'failed');
  return { status: failed.length ? (available.length ? 'PARTIAL' : 'FAILED') : 'COMPLETE', available, failed, preserveAvailableResults: available.length > 0 };
}

function transferabilityAssessment({ localJurisdiction, comparableJurisdiction, similarity = {}, minimum = 0.7 } = {}) {
  const dimensions = ['problem', 'population', 'institution', 'resource', 'policy', 'context'];
  const values = dimensions.map(key => Number(similarity[key])).filter(Number.isFinite);
  const score = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  return { localJurisdiction, comparableJurisdiction, similarityScore: score, dimensionsConsidered: values.length, transferability: score >= minimum ? 'LEAD' : 'WEAK_LEAD', effectsImported: false, causalEffectAdmissible: false };
}

function humanOverrideDecision({ requested = false, reason = '', actor = null, allowed = false } = {}) {
  if (!requested) return { status: 'NONE', applied: false };
  if (!allowed) return { status: 'BLOCKED', applied: false, reason: 'human-override-not-authorized' };
  if (!String(reason).trim() || !String(actor).trim()) return { status: 'BLOCKED', applied: false, reason: 'human-override-requires-reason-and-actor' };
  const record = { status: 'APPLIED', applied: true, actor: String(actor), reason: String(reason), timestamp: new Date().toISOString() };
  record.auditHash = crypto.createHash('sha256').update(JSON.stringify(record)).digest('hex');
  return record;
}

function sourceSearchAdmissibility(source = {}) {
  if (FAILURE_STATUSES.has(source.status)) return { admissible: false, reason: 'source-search-failed' };
  if (source.status === 'not-searched') return { admissible: false, reason: 'source-not-searched' };
  if (source.candidatesReturned == null && source.status === 'searched-empty') return { admissible: true, reason: 'searched-empty' };
  return { admissible: true, reason: null };
}

module.exports = {
  canonicalEvidenceIds,
  evidenceIntegrity,
  validateResourceCompatibility,
  validateMarginalChain,
  normalizeSourceOutage,
  transferabilityAssessment,
  humanOverrideDecision,
  sourceSearchAdmissibility
};
