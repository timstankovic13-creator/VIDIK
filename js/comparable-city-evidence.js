'use strict';

/*
 * Evidence-acquisition layer only. A comparable city can surface useful evidence,
 * including unconventional approaches, but similarity never makes causal evidence
 * admissible by itself.
 */
const DIMENSIONS = Object.freeze([
  'jurisdiction',
  'populationScale',
  'problemDefinition',
  'outcomeDefinition',
  'serviceSystem',
  'institutionalContext',
  'demographicContext',
  'implementationContext',
  'temporalCompatibility'
]);

function similarityScore(target, candidate) {
  const scores = DIMENSIONS.map(d => {
    const a = target?.[d], b = candidate?.[d];
    if (a == null || b == null) return null;
    return a === b ? 1 : 0;
  }).filter(x => x !== null);
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
}

function rankComparableCities(target, candidates, options = {}) {
  const includeUnconventional = options.includeUnconventional !== false;
  return (Array.isArray(candidates) ? candidates : [])
    .filter(c => c && c.city && (!c.productionStatus || c.productionStatus !== 'TARGET'))
    .filter(c => includeUnconventional || !c.approach?.unconventional)
    .map(c => {
      const similarity = similarityScore(target, c.profile || c);
      const evidenceQuality = Number.isFinite(c.evidenceQuality) ? c.evidenceQuality : 0;
      const outcomeMatch = Number.isFinite(c.outcomeMatch) ? c.outcomeMatch : 0;
      return {
        city: c.city,
        similarity,
        evidenceQuality,
        outcomeMatch,
        unconventional: Boolean(c.approach?.unconventional),
        approach: c.approach || null,
        evidenceIds: c.evidenceIds || [],
        // Novelty is surfaced as discovery metadata, never as a causal-quality bonus.
        acquisitionPriority: Math.min(1, similarity * 0.55 + evidenceQuality * 0.25 + outcomeMatch * 0.20),
        admissibility: { status: 'NOT_ESTABLISHED', reason: 'comparable-city-similarity-is-not-causal-admissibility' }
      };
    })
    .sort((a, b) => b.acquisitionPriority - a.acquisitionPriority || b.similarity - a.similarity || a.city.localeCompare(b.city));
}

function buildAcquisitionQueue(target, candidates, options = {}) {
  return rankComparableCities(target, candidates, options).map((x, index) => ({
    rank: index + 1,
    targetCity: target?.city || null,
    ...x,
    nextStep: x.unconventional
      ? 'Inspect approach evidence, implementation details, outcomes, and transfer conditions before any transportability judgment.'
      : 'Inspect evidence and assess transportability/admissibility before using any causal parameter.'
  }));
}

module.exports = { DIMENSIONS, similarityScore, rankComparableCities, buildAcquisitionQueue };
