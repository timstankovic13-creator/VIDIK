'use strict';

const DEFAULT_POLICY = Object.freeze({ minQuality: 0.70, maxFreshnessDays: 365, maxCausalEvidenceAgeDays: 3650, minTransportabilitySimilarity: 0.80, requireSourceJurisdiction: true, requireTargetJurisdiction: true, rejectScenarioEvidence: true });
function finiteNumber(value) { return Number.isFinite(Number(value)); }
function daysOld(asOf, now = new Date()) { const t = new Date(asOf).getTime(); const n = new Date(now).getTime(); if (!Number.isFinite(t) || !Number.isFinite(n)) return Infinity; return Math.max(0, (n - t) / 86400000); }
function normalizeCurrency(unit) { const text = String(unit || '').trim().toUpperCase(); const match = text.match(/\b(CAD|USD|AUD|EUR|GBP)\b/); return match ? match[1] : null; }
function unitsCompatible(expected, actual) { if (!expected || !actual) return false; if (expected === actual) return true; const e = normalizeCurrency(expected), a = normalizeCurrency(actual); return Boolean(e && a && e === a); }
function transportabilitySimilarity(target, source) {
  const dimensions = ['populationScale','problemDefinition','outcomeDefinition','serviceSystem','institutionalContext','demographicContext','implementationContext','temporalCompatibility'];
  const scores = dimensions.map(key => { const a = target?.[key], b = source?.[key]; if (a == null || b == null) return null; if (finiteNumber(a) && finiteNumber(b)) { const av = Number(a), bv = Number(b), scale = Math.max(1, Math.abs(av), Math.abs(bv)); return Math.max(0, 1 - Math.abs(av - bv) / scale); } return a === b ? 1 : 0; }).filter(v => v !== null);
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
}
function enforceEvidenceAdmissibility(evidence, context = {}, policy = {}) {
  const p = { ...DEFAULT_POLICY, ...policy }, failures = [];
  if (!evidence || typeof evidence !== 'object') return { admissible: false, failures: ['missing-evidence'] };
  if (!evidence.id) failures.push('missing-evidence-id');
  if (!finiteNumber(evidence.quality) || Number(evidence.quality) < p.minQuality) failures.push('evidence-quality-below-threshold');
  if (!evidence.freshnessDate && !evidence.asOf) failures.push('freshness-metadata-missing');
  const freshness = evidence.freshnessDate || evidence.asOf;
  const maxAge = evidence.evidenceType === 'causal' ? p.maxCausalEvidenceAgeDays : p.maxFreshnessDays;
  if (freshness && daysOld(freshness, context.now) > maxAge) failures.push('evidence-stale');
  if (p.rejectScenarioEvidence && (evidence.scenario === true || evidence.kind === 'scenario')) failures.push('scenario-evidence-not-production-admissible');
  if (p.requireSourceJurisdiction && !evidence.sourceJurisdiction) failures.push('source-jurisdiction-missing');
  if (p.requireTargetJurisdiction && !evidence.targetJurisdiction) failures.push('target-jurisdiction-missing');
  if (context.expectedUnit && !unitsCompatible(context.expectedUnit, evidence.unit)) failures.push('evidence-unit-incompatible');
  if (context.expectedJurisdiction && evidence.sourceJurisdiction && evidence.targetJurisdiction) {
    const source = String(evidence.sourceJurisdiction), target = String(evidence.targetJurisdiction), expected = String(context.expectedJurisdiction);
    const exact = source.toLowerCase() === expected.toLowerCase() || target.toLowerCase() === expected.toLowerCase();
    const sameCountry = source.slice(0, 2).toUpperCase() === expected.slice(0, 2).toUpperCase();
    const similarity = transportabilitySimilarity(context.targetProfile, evidence.sourceProfile || evidence.transportabilityProfile);
    if (!exact && !sameCountry && similarity < p.minTransportabilitySimilarity) failures.push('jurisdiction-transportability-not-established');
    if (evidence.transportabilitySimilarity != null && Number(evidence.transportabilitySimilarity) < p.minTransportabilitySimilarity) failures.push('transportability-similarity-below-threshold');
  }
  return { admissible: failures.length === 0, failures, transportabilitySimilarity: evidence.transportabilitySimilarity ?? transportabilitySimilarity(context.targetProfile, evidence.sourceProfile || evidence.transportabilityProfile), policy: p };
}
function validateEvidenceSet(evidenceItems, context = {}, policy = {}) {
  const items = Array.isArray(evidenceItems) ? evidenceItems : [], seen = new Set(), duplicateIds = [];
  for (const item of items) { if (item?.id && seen.has(item.id)) duplicateIds.push(item.id); if (item?.id) seen.add(item.id); }
  const results = items.map(item => ({ id: item?.id || null, ...enforceEvidenceAdmissibility(item, context, policy) }));
  if (!items.length) results.push({ id: null, admissible: false, failures: ['missing-evidence'] });
  if (duplicateIds.length) results.forEach(r => { r.admissible = false; r.failures = [...new Set([...r.failures, 'duplicate-evidence-id'])]; });
  return { valid: results.every(r => r.admissible), duplicateIds, results };
}
module.exports = { DEFAULT_POLICY, daysOld, unitsCompatible, transportabilitySimilarity, enforceEvidenceAdmissibility, validateEvidenceSet };
