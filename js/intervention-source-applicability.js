'use strict';

const { CKAN_SOURCE_IDS } = require('./source-driven-intervention-discovery');
const { SOURCE_REGISTRY } = require('./source-registry');

function normalize(value) { return String(value || '').toLowerCase().trim(); }

function assessInterventionSourceApplicability({ problem, jurisdiction = null } = {}) {
  const normalizedProblem = normalize(problem);
  if (!normalizedProblem) throw new Error('source-applicability-problem-required');

  const allSources = SOURCE_REGISTRY.filter(source => CKAN_SOURCE_IDS.has(source.sourceId));
  const applicable = [];
  const skipped = [];
  for (const source of allSources) {
    const jurisdictionMatch = !jurisdiction || source.jurisdiction === jurisdiction || source.jurisdiction === 'international';
    const tags = Array.isArray(source.discoveryTags) ? source.discoveryTags.map(normalize).filter(Boolean) : [];
    const tagMatch = tags.length === 0 || tags.some(tag => normalizedProblem.includes(tag));
    const selected = jurisdictionMatch && tagMatch;
    const reason = !jurisdictionMatch ? 'jurisdiction-mismatch' : tagMatch ? 'capability-match' : 'no-explicit-tag-match';
    const record = { sourceId: source.sourceId, jurisdiction: source.jurisdiction, selected, reason, capabilityTags: tags };
    (selected ? applicable : skipped).push(record);
  }

  // An arbitrary problem must never silently become "no sources" merely because
  // the registry lacks a matching keyword. When no explicit source matches,
  // search every jurisdiction-compatible intervention catalog as exploratory.
  const fallback = applicable.length === 0
    ? allSources.filter(source => !jurisdiction || source.jurisdiction === jurisdiction || source.jurisdiction === 'international')
    : [];
  const selected = fallback.length ? fallback : allSources.filter(source => applicable.some(item => item.sourceId === source.sourceId));

  const decisions = allSources.map(item => {
    const prior = [...applicable, ...skipped].find(record => record.sourceId === item.sourceId);
    const selectedNow = selected.some(source => source.sourceId === item.sourceId);
    return { ...prior, selected: selectedNow, reason: selectedNow && !prior.selected ? 'exploratory-fallback' : prior.reason };
  });

  return {
    problem,
    jurisdiction,
    sourcesConsidered: allSources.map(source => source.sourceId),
    sourcesSelected: selected.map(source => source.sourceId),
    fallbackApplied: fallback.length > 0,
    decisions,
    searchRequired: selected.length > 0,
    noApplicableSource: selected.length === 0
  };
}

module.exports = { assessInterventionSourceApplicability };
