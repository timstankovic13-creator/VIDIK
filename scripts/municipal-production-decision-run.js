#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const { evaluateResourceOptimization } = require('../js/vidik-resource-optimization');

const SOURCES = Object.freeze({
  Ottawa: Object.freeze({ jurisdiction: 'CA-ON', sourceUrl: 'https://www.ottawa.ca/en/family-and-social-services/housing-and-homelessness/plans-facts-and-data/point-time-count/enumeration-overview-and-results', sourceType: 'municipal-web-report', dataset: 'ottawa-2024-pit-count', field: 'people_experiencing_homelessness', unit: 'people', aggregation: 'reported_point_in_time', role: 'observed_context', pattern: /In\s+October\s+2024\s*[,:]?\s*(?:there\s+were\s+)?([\d,\s]+?)\s+people\s+reported\s+experiencing\s+homelessness\s+in\s+Ottawa\.?/i, definition: 'People reported experiencing homelessness in the October 2024 Point-in-Time enumeration; dependents excluded from the comparable PiT series.' }),
  Toronto: Object.freeze({ jurisdiction: 'CA-ON', sourceUrl: 'https://www.toronto.ca/news/city-of-toronto-releases-findings-of-2024-street-needs-assessment-homelessness-survey/', sourceType: 'municipal-news-report', dataset: 'toronto-2024-street-needs-assessment', field: 'people_experiencing_homelessness', unit: 'people', aggregation: 'estimated_point_in_time', role: 'observed_context', pattern: /An\s+estimated\s+([\d,\s]+?)\s+people\s+were\s+experiencing\s+homelessness\s+in\s+Toronto\s+last\s+fall/i, definition: 'Estimated people experiencing homelessness in the October 2024 Street Needs Assessment.' }),
  Melbourne: Object.freeze({ jurisdiction: 'AU-VIC', sourceUrl: 'https://participate.melbourne.vic.gov.au/make-room/project-overview', sourceType: 'municipal-project-report', dataset: 'melbourne-by-name-list-2024', field: 'people_experiencing_chronic_homelessness_or_rough_sleeping', unit: 'people', aggregation: 'reported_point_in_time', role: 'observed_context', pattern: /as\s+of\s+May\s+2024\s*,?\s*the\s+current\s+number\s+of\s+people\s+recorded\s+as\s+experiencing\s+chronic\s+homelessness\s+and\s+rough\s+sleeping\s+in\s+the\s+City\s+of\s+Melbourne\s+is\s+([\d,\s]+)/i, definition: 'People recorded on the Melbourne By Name List as experiencing chronic homelessness and rough sleeping as of May 2024; this is narrower than the Ottawa/Toronto homelessness measures.' })
});

const CAUSAL = Object.freeze({ housing: Object.freeze({ id: 'housing-rct', estimate: 0.42, unit: 'absolute stable-housing probability difference', uncertainty: { low: 0.36, high: 0.48 }, source: 'One-year outcomes of a randomized controlled trial of Housing First with ACT in five Canadian cities', jurisdiction: 'Canada' }) });
const INTERVENTIONS = Object.freeze([
  Object.freeze({ id: 'housing', name: 'Housing First / supportive housing', risk: 0.22 }),
  Object.freeze({ id: 'ase', name: 'Automated speed enforcement / speed management', risk: 0.28 }),
  Object.freeze({ id: 'paramedic', name: 'Additional paramedic capacity', risk: 0.20 })
]);

function sha256(value) { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function assertOfficialUrl(url) {
  const u = new URL(url);
  if (u.protocol !== 'https:') throw new Error('source-url-must-use-https');
  if (!['ottawa.ca', 'www.ottawa.ca', 'toronto.ca', 'www.toronto.ca', 'participate.melbourne.vic.gov.au'].includes(u.hostname)) throw new Error(`source-host-not-allowlisted:${u.hostname}`);
  return u.toString();
}
async function fetchText(url, fetchImpl = globalThis.fetch) {
  const safe = assertOfficialUrl(url);
  if (typeof fetchImpl !== 'function') throw new Error('fetch-unavailable');
  let current = safe;
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const response = await fetchImpl(current, { headers: { accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7', 'accept-language': 'en-CA,en;q=0.9', 'cache-control': 'no-cache', pragma: 'no-cache', 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36' }, redirect: 'manual' });
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers?.get?.('location') || response.headers?.get?.('Location');
      if (!location) throw new Error(`upstream-redirect-missing-location:${current}`);
      current = assertOfficialUrl(new URL(location, current).toString());
      continue;
    }
    if (!response.ok) throw new Error(`upstream-http:${response.status}:${current}`);
    return { text: await response.text(), finalUrl: current, status: response.status };
  }
  throw new Error(`upstream-too-many-redirects:${safe}`);
}
function normalizeSourceText(text) {
  return String(text)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractNumericObservation(city, text, primaryMatch) {
  if (primaryMatch) return primaryMatch;
  const fallbackPatterns = {
    Ottawa: [
      /October\s+2024[\s,:-]{0,12}(?:there\s+were\s+)?([\d][\d,\s]{0,12})\s+people\s+reported\s+experiencing\s+homelessness\s+in\s+Ottawa/i,
      /([\d][\d,\s]{0,12})\s+people\s+reported\s+experiencing\s+homelessness\s+in\s+Ottawa/i
    ],
    Toronto: [
      /estimated\s+([\d][\d,\s]{0,12})\s+people\s+were\s+experiencing\s+homelessness\s+in\s+Toronto/i,
      /([\d][\d,\s]{0,12})\s+people\s+were\s+experiencing\s+homelessness\s+in\s+Toronto/i
    ],
    Melbourne: [
      /May\s+2024[\s,:-]{0,12}.*?\b(?:is|was)\s+([\d][\d,\s]{0,12})/i,
      /chronic\s+homelessness\s+and\s+rough\s+sleeping.*?\b(?:is|was)\s+([\d][\d,\s]{0,12})/i
    ]
  };
  for (const pattern of fallbackPatterns[city] || []) {
    const match = pattern.exec(text);
    if (match) return match;
  }
  return null;
}

function parseObservation(city, text) {
  const spec = SOURCES[city];
  if (!spec) throw new Error(`unsupported-city:${city}`);
  const normalizedText = normalizeSourceText(text);
  const primaryMatch = spec.pattern.exec(normalizedText);
  const match = extractNumericObservation(city, normalizedText, primaryMatch);
  if (!match) throw new Error(`${city}:live-source-semantic-pattern-not-found`);
  const value = Number(match[1].replace(/[\s,]/g, ''));
  if (!Number.isFinite(value) || value < 0) throw new Error(`${city}:live-source-observation-invalid`);
  return { city, dataset: spec.dataset, field: spec.field, unit: spec.unit, aggregation: spec.aggregation, role: spec.role, value, definition: spec.definition, extraction: { method: primaryMatch ? 'source-semantic-pattern-capture' : 'source-semantic-fallback-capture', capturedValue: value } };
}
function admissibility(city, intervention, options = {}) {
  const override = options.scenarioEvidence?.[city]?.[intervention.id];
  if (override) return { admissible: Boolean(override.admissible), failures: override.admissible ? [] : [override.failure || 'scenario-evidence-inadmissible'], causalEvidence: override.evidence || null, scenario: true };
  if (intervention.id === 'housing') {
    if (city === 'Melbourne') return { admissible: false, failures: ['causal-effect-not-transportable-to-city'], causalEvidence: { ...CAUSAL.housing, mode: 'cross-country', sourceJurisdiction: 'Canada', targetJurisdiction: 'Australia', rationale: 'No registered Australia/Melbourne transportability evidence for the Canadian Housing First causal estimate.' } };
    if (city === 'Toronto') return { admissible: true, failures: [], causalEvidence: { ...CAUSAL.housing, mode: 'site-supported', sourceJurisdiction: 'Canada', targetJurisdiction: 'Toronto, Canada', rationale: 'The multisite Canadian RCT included Toronto directly; no cross-country transport is required for the causal estimate.' } };
    return { admissible: true, failures: [], causalEvidence: { ...CAUSAL.housing, mode: 'transported', sourceJurisdiction: 'Canada', targetJurisdiction: 'Ottawa, Canada', rationale: 'The Canadian multisite RCT did not include Ottawa; the estimate is transported within the same national health/housing system and remains explicitly labelled as transported.' } };
  }
  if (intervention.id === 'ase') return { admissible: false, failures: ['city-specific-ase-admissibility-evidence-missing'], causalEvidence: null };
  return { admissible: false, failures: ['no-city-specific-semantic-mapping'], causalEvidence: null };
}
function scoreIntervention(intervention, gate) {
  if (!gate.admissible || !gate.causalEvidence || !Number.isFinite(gate.causalEvidence.estimate)) return null;
  return gate.causalEvidence.estimate * (1 - intervention.risk);
}
function chooseRecommendation(comparison) {
  const admissible = comparison.filter(x => x.status === 'ADMISSIBLE' && Number.isFinite(x.score));
  if (!admissible.length) return null;
  return admissible.slice().sort((a,b) => b.score - a.score || a.id.localeCompare(b.id))[0].id;
}
function buildLearning(outcome) {
  if (!outcome) return null;
  const predicted = Number(outcome.predicted);
  const observed = Number(outcome.observed);
  if (!Number.isFinite(predicted) || !Number.isFinite(observed)) throw new Error('outcome-must-be-finite');
  const error = observed - predicted;
  const adjustment = Math.max(-0.05, Math.min(0.05, error));
  const drift = Math.abs(error) >= 0.05;
  return { outcome: { ...outcome, kind: outcome.kind || 'observed-outcome', provenance: outcome.provenance || 'caller-supplied', error }, recalibration: { targetParameterId: 'housing:effect', adjustment, application: 'EXPLICIT_PARAMETER_MAPPING' }, drift: { detected: drift, threshold: 0.05, metric: 'absolute_prediction_error' } };
}

async function runCity(city, options = {}) {
  const spec = SOURCES[city];
  if (!spec) throw new Error(`unsupported-city:${city}`);
  const retrievedAt = new Date().toISOString();
  const fetched = await fetchText(spec.sourceUrl, options.fetchImpl);
  const observation = parseObservation(city, fetched.text);
  const source = { provider: city === 'Melbourne' ? 'City of Melbourne' : city === 'Toronto' ? 'City of Toronto' : 'City of Ottawa', sourceUrl: spec.sourceUrl, sourceType: spec.sourceType, dataset: spec.dataset, retrievedAt, finalUrl: fetched.finalUrl, semanticContract: { field: spec.field, unit: spec.unit, aggregation: spec.aggregation, role: spec.role } };
  const comparison = INTERVENTIONS.map(intervention => {
    const gate = admissibility(city, intervention, options);
    return { ...intervention, gate, score: scoreIntervention(intervention, gate), status: gate.admissible ? 'ADMISSIBLE' : 'BLOCKED' };
  });
  const recommendation = chooseRecommendation(comparison);
  const decisionState = recommendation ? 'RECOMMENDATION' : 'BLOCKED';
  const selected = comparison.find(x => x.id === recommendation);
  const counterfactual = selected?.id === 'housing' ? { intervention: 'housing', statusQuoEffect: 0, interventionEffect: selected.gate.causalEvidence.estimate, incrementalEffect: selected.gate.causalEvidence.estimate, evidenceIds: [selected.gate.causalEvidence.id], semantics: 'Causal effect estimate is distinct from the municipal observed context.' } : selected ? { intervention: selected.id, statusQuoEffect: 0, interventionEffect: selected.gate.causalEvidence.estimate, incrementalEffect: selected.gate.causalEvidence.estimate, evidenceIds: [selected.gate.causalEvidence.id], semantics: 'Controlled scenario evidence; not a production claim.' } : null;
  const selectedEvidence = selected?.gate.causalEvidence;
  const lineage = [{ evidenceId: `municipal:${city}:housing.need`, kind: 'observed_context', parameterId: 'housing.need', source: source.sourceUrl }, ...(selectedEvidence ? [{ evidenceId: selectedEvidence.id, kind: 'causal_effect', parameterId: `${selected.id}:effect`, transportability: selectedEvidence }] : [])];
  const learning = recommendation ? buildLearning(options.outcome) : null;
  const resourceEnvelope = options.resourceEnvelope || null;
  const optimization = evaluateResourceOptimization(resourceEnvelope, comparison, options.resourceModels || {});
  return { schemaVersion: 'production-decision-run.v1', city, objective: 'verified-outcome-improvement', decisionState, decisionId: `VIDIK-${city.toLowerCase()}-${sha256({ city, observation, lineage }).slice(0,12)}`, observedContext: observation, sourceLineage: source, interventionComparison: comparison, recommendation, recommendationName: selected?.name || null, lineage, counterfactual, learning, resourceEnvelope, optimization, audit: { generatedAt: retrievedAt, failureClosed: !recommendation, blockedAlternatives: comparison.filter(x => x.status === 'BLOCKED').map(x => ({ id: x.id, failures: x.gate.failures })), causalTransportability: comparison.find(x => x.id === 'housing').gate.causalEvidence, evidenceHash: sha256({ source, observation, lineage, counterfactual }), scenario: Boolean(options.scenarioEvidence) } };
}
async function runAll(options = {}) {
  const results = [];
  for (const city of ['Ottawa','Toronto','Melbourne']) results.push(await runCity(city, options));
  return { schemaVersion: 'production-three-city-acceptance.v1', decisionProblem: 'Allocate a fixed municipal resource pool among the same intervention universe subject to evidence/admissibility gates.', cities: results, comparison: results.map(r => ({ city:r.city, state:r.decisionState, recommendation:r.recommendation, observedField:r.observedContext.field, observedValue:r.observedContext.value, optimization:r.optimization.status })), acceptance: { Ottawa: results.find(r => r.city === 'Ottawa').decisionState === 'RECOMMENDATION', Toronto: results.find(r => r.city === 'Toronto').decisionState === 'RECOMMENDATION', Melbourne: results.find(r => r.city === 'Melbourne').decisionState === 'BLOCKED' && results.find(r => r.city === 'Melbourne').audit.failureClosed } };
}
if (require.main === module) runAll().then(result => process.stdout.write(JSON.stringify(result,null,2)+'\n')).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
module.exports = { SOURCES, CAUSAL, INTERVENTIONS, fetchText, normalizeSourceText, extractNumericObservation, parseObservation, admissibility, scoreIntervention, chooseRecommendation, buildLearning, runCity, runAll };
