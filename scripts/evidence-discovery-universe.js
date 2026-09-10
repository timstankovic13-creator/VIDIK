'use strict';

/*
 * Converts discovery output into an expanded intervention universe.
 * The existing taxonomy remains a seed ontology. Discovered candidates are
 * appended with provenance and an explicit unverified state; no score or
 * recommendation is created at this boundary.
 */

function clean(value) {
  return String(value || '').trim();
}

function normalizeName(value) {
  return clean(value).replace(/\s+/g, ' ');
}

function expandInterventionUniverse(seed = [], discovery = {}) {
  if (!Array.isArray(seed)) throw new Error('seed-universe-required');
  const discovered = Array.isArray(discovery.candidates) ? discovery.candidates : [];
  const result = [];
  const seen = new Set();

  for (const item of seed) {
    const name = normalizeName(typeof item === 'string' ? item : item?.name);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      ...(typeof item === 'object' ? item : {}),
      name,
      origin: 'seed-taxonomy',
      discoveryStatus: 'preexisting',
      admissibility: item?.admissibility || 'unverified',
    });
  }

  for (const item of discovered) {
    const name = normalizeName(typeof item === 'string' ? item : item?.name);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      name,
      origin: 'evidence-discovered',
      discoveryStatus: 'discovered',
      admissibility: 'unverified',
      sourceRecordIds: Array.isArray(item?.sourceRecordIds) ? [...item.sourceRecordIds] : [],
    });
  }

  return result;
}

module.exports = { expandInterventionUniverse };
