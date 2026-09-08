'use strict';

// Explicit, city-specific mappings. These are observed/context parameters only;
// they are NOT causal effect estimates and must never substitute for causal evidence.
const MUNICIPAL_PARAMETER_MAPPINGS = Object.freeze({
  Ottawa: Object.freeze({
    datasetHint: 'collision',
    mappings: Object.freeze([
      Object.freeze({ parameterName: 'observed_fatal_collision_rate', fieldCandidates: ['properties.COLLISION_CLASS', 'properties.Collision_Class', 'COLLISION_CLASS', 'Collision_Class', 'properties.CLASS', 'CLASS'], unit: 'fatal-collisions-per-collision-record', role: 'context', causalEligible: false, aggregation: 'category-rate', categoryValues: ['fatal'], semantic: 'share of collision records classified as fatal' }),
      Object.freeze({ parameterName: 'observed_injuries', fieldCandidates: ['properties.NO_OF_INJURIES', 'properties.No_of_Injuries', 'NO_OF_INJURIES', 'No_of_Injuries'], unit: 'injuries-per-source-window', role: 'context', causalEligible: false, aggregation: 'sum', semantic: 'reported injuries in collision records' }),
    ]),
  }),
  Toronto: Object.freeze({
    datasetHint: 'traffic collisions',
    mappings: Object.freeze([
      Object.freeze({ parameterName: 'observed_fatal_collision_rate', fieldCandidates: ['ACCLASS', 'acclass', 'properties.ACCLASS', 'properties.AC_CLASS'], unit: 'fatal-collisions-per-collision-record', role: 'context', causalEligible: false, aggregation: 'category-rate', categoryValues: ['fatal'], semantic: 'share of collision records classified as fatal' }),
      Object.freeze({ parameterName: 'observed_injuries', fieldCandidates: ['FATAL_NO'], unit: 'fatalities-per-source-record', role: 'context', causalEligible: false, aggregation: 'sum', semantic: 'fatality count where the source supplies it' }),
    ]),
  }),
  Melbourne: Object.freeze({
    datasetHint: 'pedestrian counting system',
    mappings: Object.freeze([
      Object.freeze({ parameterName: 'observed_pedestrian_volume', fieldCandidates: ['pedestriancount', 'fields.pedestriancount'], unit: 'pedestrians-per-sensor-hour', role: 'context', causalEligible: false, aggregation: 'mean', semantic: 'total hourly pedestrian sensor count' }),
    ]),
  }),
});

function getNested(record, field) {
  return String(field).split('.').reduce((value, key) => value == null ? undefined : value[key], record);
}

function resolveMunicipalMapping(city, records) {
  const config = MUNICIPAL_PARAMETER_MAPPINGS[String(city || '').trim()];
  if (!config) throw new Error(`no-municipal-parameter-registry:${city}`);
  if (!Array.isArray(records) || !records.length) throw new Error(`no-municipal-records:${city}`);
  for (const mapping of config.mappings) {
    for (const field of mapping.fieldCandidates) {
      const values = records.map(record => getNested(record, field));
      if (mapping.aggregation === 'category-rate') {
        if (values.every(value => value !== undefined && value !== null && String(value).trim() !== '')) return { ...mapping, field, resolved: true };
      } else {
        const numeric = values.map(Number);
        if (numeric.every(Number.isFinite)) return { ...mapping, field, resolved: true };
      }
    }
  }
  const keys = Object.keys(records[0] || {});
  throw new Error(`no-semantic-municipal-parameter:${city}:available=${keys.join(',')}`);
}

function assertContextOnlyMapping(mapping) {
  if (!mapping || mapping.role !== 'context' || mapping.causalEligible !== false) throw new Error('municipal-mapping-must-be-context-only');
  return true;
}

if (typeof module !== 'undefined') module.exports = { MUNICIPAL_PARAMETER_MAPPINGS, getNested, resolveMunicipalMapping, assertContextOnlyMapping };
if (typeof globalThis !== 'undefined') globalThis.VIDIK_MUNICIPAL_PARAMETER_MAPPINGS = MUNICIPAL_PARAMETER_MAPPINGS;
