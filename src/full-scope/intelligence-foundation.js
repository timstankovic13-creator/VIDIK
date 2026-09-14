'use strict';

const crypto = require('crypto');

const text = value => String(value ?? '').trim();
const finite = value => Number.isFinite(Number(value));
const positive = value => finite(value) && Number(value) > 0;
const unique = values => [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))];

const INTERVENTION_FAMILIES = Object.freeze([
  ['prevention','Prevent the problem before occurrence'],
  ['early-intervention','Identify and intervene before escalation'],
  ['direct-service','Deliver a service directly to affected people'],
  ['clinical','Clinical or health-system intervention'],
  ['infrastructure','Physical or digital infrastructure change'],
  ['environmental','Modify environmental or place-based conditions'],
  ['enforcement','Regulatory, compliance, or targeted enforcement'],
  ['economic','Prices, transfers, subsidies, incentives, or employment'],
  ['information','Information, education, navigation, or behavioural support'],
  ['system-capacity','Increase institutional, workforce, or operational capacity'],
  ['policy','Rules, eligibility, standards, or administrative policy'],
  ['coordination','Cross-agency, community, or network coordination']
]);

const CAUSAL_METHODS = new Set([
  'randomized-trial','cluster-randomized-trial','natural-experiment','difference-in-differences',
  'regression-discontinuity','instrumental-variable','matched-observational','longitudinal',
  'systematic-review','meta-analysis','quasi-experimental'
]);

const REQUIRED_EVIDENCE = Object.freeze(['causal','implementation','cost','equity']);

function normalizeProblem(problem) {
  const raw = text(problem).toLowerCase();
  const tokens = unique(raw.replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/));
  return { raw: text(problem), tokens };
}

function stableHash(value) {
  const canonical = value && typeof value === 'object'
    ? (Array.isArray(value) ? value.map(stableHash) : Object.fromEntries(Object.keys(value).sort().map(k => [k, stableHash(value[k])])))
    : value;
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

function inferFamilies(candidate = {}) {
  const haystack = text([
    candidate.name, candidate.description, candidate.mechanism,
    ...(candidate.domains || []), ...(candidate.tags || []), ...(candidate.problemTags || [])
  ].join(' ')).toLowerCase();
  const hits = [];
  const rules = [
    ['prevention',['prevent','prevention','screening','early warning']],
    ['early-intervention',['early intervention','outreach','case finding']],
    ['direct-service',['service','shelter','housing','outreach','paramedic','counselling','counseling']],
    ['clinical',['clinical','treatment','medical','health','opioid','overdose']],
    ['infrastructure',['infrastructure','road','transit','building','capital','technology']],
    ['environmental',['vacant lot','tree','green','stormwater','drainage','environment','heat']],
    ['enforcement',['enforcement','deterrence','inspection','compliance','police','regulatory']],
    ['economic',['subsidy','income','employment','job','cash','incentive','rent']],
    ['information',['education','information','training','navigation','messaging']],
    ['system-capacity',['capacity','staff','workforce','beds','paramedic','response']],
    ['policy',['policy','eligibility','standard','ordinance','rule']],
    ['coordination',['coordination','partnership','network','multi-agency','community']]
  ];
  for (const [family, signals] of rules) if (signals.some(signal => haystack.includes(signal))) hits.push(family);
  return unique(hits);
}

function buildInterventionUniverse(problem, inputs = {}) {
  const normalized = normalizeProblem(problem);
  if (!normalized.raw) throw new Error('intelligence-problem-required');
  const records = [
    ...(Array.isArray(inputs.acquiredCandidates) ? inputs.acquiredCandidates : []),
    ...(Array.isArray(inputs.localCandidates) ? inputs.localCandidates : []),
    ...(Array.isArray(inputs.candidates) ? inputs.candidates : [])
  ];
  const seen = new Map();
  for (const record of records) {
    const id = text(record?.id);
    const name = text(record?.name || record?.title);
    if (!id || !name) continue;
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const candidate = {
      id, name, description: text(record.description || record.notes),
      domains: unique(record.domains), problemTags: unique(record.problemTags || record.tags),
      sourceIds: unique([record.sourceId, record.discovery?.sourceId, ...(record.sourceIds || [])]),
      families: unique([...(record.families || []), ...inferFamilies(record)]),
      mechanism: text(record.mechanism), discoveryOnly: true, leadOnly: true,
      evidenceStatus: 'potential', effectsImported: false, causalEffectImported: false
    };
    const prior = seen.get(key);
    if (!prior || candidate.sourceIds.length > prior.sourceIds.length) seen.set(key, candidate);
  }
  const candidates = [...seen.values()].map(candidate => ({
    ...candidate,
    families: candidate.families.length ? candidate.families : ['coordination']
  }));
  const observedFamilies = new Set(candidates.flatMap(c => c.families));
  const familyCoverage = INTERVENTION_FAMILIES.map(([id, description]) => ({
    id, description, represented: observedFamilies.has(id), candidateCount: candidates.filter(c => c.families.includes(id)).length
  }));
  const missingFamilies = familyCoverage.filter(x => !x.represented).map(x => x.id);
  const sourceIds = unique(records.flatMap(r => [r.sourceId, r.discovery?.sourceId, ...(r.sourceIds || [])]));
  return {
    schemaVersion: 'vidik.intervention-universe.v2', problem: normalized.raw, problemTokens: normalized.tokens,
    candidates: candidates.sort((a,b) => a.id.localeCompare(b.id)), candidateCount: candidates.length,
    sourcesSearched: sourceIds, familyCoverage, missingFamilies,
    completeness: { familyCoverageRate: familyCoverage.length ? (familyCoverage.length - missingFamilies.length) / familyCoverage.length : 0, candidateCoverageRate: candidates.length ? 1 : 0 },
    searchRequired: missingFamilies.length > 0 || candidates.length === 0,
    recommendationAllowed: false, effectsImported: false,
    auditHash: stableHash({problem: normalized.raw, candidates, familyCoverage}),
    rule: 'Universe construction expands and exposes gaps; it never creates causal effects or recommendation authority.'
  };
}

function planEvidenceAcquisition(universe, inputs = {}) {
  if (!universe || universe.schemaVersion !== 'vidik.intervention-universe.v2') throw new Error('valid-intervention-universe-required');
  const registry = Array.isArray(inputs.sourceRegistry) ? inputs.sourceRegistry : [];
  const evidenceIndex = inputs.evidenceIndex && typeof inputs.evidenceIndex === 'object' ? inputs.evidenceIndex : {};
  const plans = universe.candidates.map(candidate => {
    const existing = evidenceIndex[candidate.id] || {};
    const required = unique([...(candidate.requiredEvidence || REQUIRED_EVIDENCE)]);
    const missing = required.filter(type => existing[type]?.status !== 'verified' && existing[type]?.status !== 'supported');
    const sourcePlans = registry.map(source => {
      const sourceTypes = unique(source.evidenceTypes || source.domains || []);
      const coverage = missing.filter(type => sourceTypes.includes(type) || sourceTypes.includes('all')).length;
      return { sourceId: text(source.id), sourceType: text(source.type), authority: Number.isFinite(Number(source.authority)) ? Number(source.authority) : 0, independenceGroup: text(source.independenceGroup) || text(source.id), coverage };
    }).filter(s => s.sourceId).sort((a,b) => b.coverage-a.coverage || b.authority-a.authority || a.sourceId.localeCompare(b.sourceId));
    const independentGroups = unique(sourcePlans.filter(s => s.coverage > 0).map(s => s.independenceGroup));
    return { candidateId: candidate.id, requiredEvidence: required, present: required.filter(type => !missing.includes(type)), missing, status: missing.length ? 'acquisition-required' : 'evidence-sufficient', sourcePlans, independentSourceGroupsAvailable: independentGroups.length, requiresIndependentVerification: missing.includes('causal') };
  });
  return {
    schemaVersion:'vidik.evidence-acquisition-plan.v2', candidatePlans:plans,
    blockedCount:plans.filter(p => p.missing.length).length,
    sourceRegistryCount:registry.length,
    rule:'Acquisition identifies admissible evidence work. It cannot promote a lead or import an effect.'
  };
}

function buildCausalEvidenceGraph(candidate, evidence = []) {
  const rows = Array.isArray(evidence) ? evidence : [];
  const nodes = [{id:`problem:${text(candidate.problem || 'unknown')}`,type:'problem'}, {id:`intervention:${text(candidate.id)}`,type:'intervention'}];
  const edges = [];
  const admissible = [];
  const rejected = [];
  for (const [index, item] of rows.entries()) {
    const method = text(item.causalMethod || item.method).toLowerCase();
    const sourceId = text(item.sourceId);
    const verified = item.verification?.status === 'verified' || item.verified === true;
    const effect = Number(item.effect ?? item.effectEstimate);
    const effectUnit = text(item.effectUnit || item.unit);
    const row = {index, sourceId, method, verified, effect, effectUnit};
    if (!sourceId || !CAUSAL_METHODS.has(method) || !verified || !finite(effect) || !effectUnit) { rejected.push({...row, reason: !sourceId?'source-missing':!CAUSAL_METHODS.has(method)?'causal-method-not-admissible':!verified?'independent-verification-missing':!finite(effect)?'nonfinite-effect':'effect-unit-missing'}); continue; }
    const outcomeId = `outcome:${text(item.outcome || effectUnit)}`;
    if (!nodes.some(n => n.id === outcomeId)) nodes.push({id:outcomeId,type:'outcome',unit:effectUnit});
    edges.push({from:`intervention:${text(candidate.id)}`,to:outcomeId,relation:'causal-effect',sourceId,method,effect,effectUnit,verified:true});
    admissible.push(row);
  }
  const sourceGroups = unique(admissible.map(x => text(x.sourceId))).length;
  return {
    schemaVersion:'vidik.causal-evidence-graph.v1', nodes, edges, admissibleEvidence:admissible, rejectedEvidence:rejected,
    independentSourceCount:sourceGroups, causalReady:sourceGroups >= 2 && edges.length >= 2,
    effectImportAllowed:false, parameterMutationAllowed:false,
    auditHash:stableHash({nodes,edges,rejected})
  };
}

function scoreTransferability(target = {}, source = {}, dimensions = {}) {
  const keys = ['population','density','baselineRate','serviceCapacity','legalEnvironment','implementationModel','geography','climate','institutionalStructure'];
  const weights = {...Object.fromEntries(keys.map(k => [k, 1])), ...(dimensions.weights || {})};
  let totalWeight = 0; let matchedWeight = 0; const breakdown = [];
  for (const key of keys) {
    const weight = finite(weights[key]) && Number(weights[key]) > 0 ? Number(weights[key]) : 1;
    totalWeight += weight;
    const tv = target[key]; const sv = source[key];
    let similarity = 0;
    if (tv !== undefined && sv !== undefined && tv !== null && sv !== null) {
      if (typeof tv === 'number' && typeof sv === 'number' && finite(tv) && finite(sv)) {
        const scale = Math.max(Math.abs(Number(tv)), Math.abs(Number(sv)), 1);
        similarity = Math.max(0, 1 - Math.abs(Number(tv)-Number(sv))/scale);
      } else similarity = text(tv).toLowerCase() === text(sv).toLowerCase() ? 1 : 0;
    }
    matchedWeight += weight * similarity;
    breakdown.push({dimension:key, weight, similarity, observed:tv!==undefined&&sv!==undefined});
  }
  const score = totalWeight ? matchedWeight / totalWeight : 0;
  const band = score >= 0.8 ? 'high' : score >= 0.6 ? 'moderate' : score >= 0.4 ? 'low' : 'insufficient';
  return {schemaVersion:'vidik.transferability.v1', score, band, breakdown, comparable:score >= 0.6, effectTransferAllowed:false, parameterMutationAllowed:false, requiresLocalValidation:score < 0.8, auditHash:stableHash({score,band,breakdown})};
}

function optimizeResourceAllocation(candidates = [], budget, options = {}) {
  const totalBudget = Number(budget);
  if (!finite(totalBudget) || totalBudget < 0) throw new Error('valid-nonnegative-budget-required');
  const rows = (Array.isArray(candidates) ? candidates : []).map(raw => ({
    id:text(raw.id), effectUnit:text(raw.effectUnit).toLowerCase(), resourceUnit:text(raw.resourceUnit).toLowerCase(),
    maxResource:positive(raw.maxResource) ? Number(raw.maxResource) : positive(raw.resource) ? Number(raw.resource) : 0,
    step:positive(raw.step) ? Number(raw.step) : 1,
    fixedCost:finite(raw.fixedCost) && Number(raw.fixedCost) >= 0 ? Number(raw.fixedCost) : 0,
    effectAtMax:finite(raw.effectAtMax) ? Number(raw.effectAtMax) : finite(raw.effect) ? Number(raw.effect) : null,
    returns: Array.isArray(raw.returns) ? raw.returns.map(Number).filter(finite) : []
  })).filter(r => r.id && r.effectUnit && r.resourceUnit && r.maxResource > 0 && r.effectAtMax !== null && r.effectAtMax > 0);
  if (!rows.length) return {schemaVersion:'vidik.resource-allocation.v2', selected:[], remainingBudget:totalBudget, totalEffect:0, blockedReason:'no-admissible-candidates', opportunityCosts:[], crossUnitComparison:false};
  const effectUnits = unique(rows.map(r=>r.effectUnit)); const resourceUnits = unique(rows.map(r=>r.resourceUnit));
  if (effectUnits.length !== 1 || resourceUnits.length !== 1) return {schemaVersion:'vidik.resource-allocation.v2', selected:[], remainingBudget:totalBudget, totalEffect:null, blockedReason:'incomparable-effect-or-resource-units', crossUnitComparison:false};
  const allocations = rows.map(r => ({...r, allocated:0}));
  let remaining = totalBudget;
  const marginal = row => {
    const fraction = Math.min(1, (row.allocated + row.step) / row.maxResource);
    const priorFraction = Math.min(1, row.allocated / row.maxResource);
    const curve = x => Math.pow(x, Number.isFinite(Number(options.curvature)) && Number(options.curvature) > 0 ? Number(options.curvature) : 0.85);
    const base = row.effectAtMax;
    const prior = base * curve(priorFraction);
    const next = base * curve(fraction);
    return {effect:Math.max(0,next-prior), resource:Math.min(row.step, row.maxResource-row.allocated)};
  };
  while (remaining > 0) {
    const choices = allocations.map(row => ({row, gain:marginal(row)})).filter(x => x.gain.resource > 0 && x.gain.resource <= remaining + 1e-9 && x.gain.effect > 0);
    if (!choices.length) break;
    choices.sort((a,b) => (b.gain.effect/b.gain.resource)-(a.gain.effect/a.gain.resource) || a.row.id.localeCompare(b.row.id));
    const choice = choices[0]; choice.row.allocated += choice.gain.resource; remaining -= choice.gain.resource;
  }
  const selected = allocations.filter(r=>r.allocated>0).map(r=>({candidateId:r.id,resource:r.allocated,resourceUnit:r.resourceUnit,effect:r.effectAtMax*Math.pow(Math.min(1,r.allocated/r.maxResource), Number(options.curvature)>0?Number(options.curvature):0.85),effectUnit:r.effectUnit}));
  const totalEffect = selected.reduce((sum,x)=>sum+x.effect,0);
  const opportunityCosts = allocations.filter(r=>r.allocated===0).map(r=>({candidateId:r.id,foregoneMarginalEffect:marginal(r).effect,effectUnit:r.effectUnit})).sort((a,b)=>b.foregoneMarginalEffect-a.foregoneMarginalEffect);
  return {schemaVersion:'vidik.resource-allocation.v2', budget:totalBudget, selected, remainingBudget:Math.max(0,remaining), totalEffect, effectUnit:effectUnits[0], resourceUnit:resourceUnits[0], opportunityCosts, crossUnitComparison:false, nonlinear:true, auditHash:stableHash({budget:totalBudget,selected,remaining})};
}

function runIntelligenceFoundation(problem, inputs = {}) {
  const universe = buildInterventionUniverse(problem, inputs);
  const acquisition = planEvidenceAcquisition(universe, inputs);
  const causalGraphs = Object.fromEntries((inputs.causalEvidence || []).map(row => [text(row.candidateId), buildCausalEvidenceGraph({...row, problem}, row.evidence)]));
  const transfer = (Array.isArray(inputs.comparableCities) ? inputs.comparableCities : []).map(row => ({cityId:text(row.cityId), interventionId:text(row.interventionId), transferability:scoreTransferability(inputs.targetContext || {}, row.context || {})}));
  return {schemaVersion:'vidik.intelligence-foundation.v1', universe, acquisition, causalGraphs, transfer, recommendationAuthority:false, parameterMutationAllowed:false, effectsImported:false, auditHash:stableHash({universe,acquisition,causalGraphs,transfer})};
}

module.exports = { INTERVENTION_FAMILIES, CAUSAL_METHODS, REQUIRED_EVIDENCE, normalizeProblem, stableHash, inferFamilies, buildInterventionUniverse, planEvidenceAcquisition, buildCausalEvidenceGraph, scoreTransferability, optimizeResourceAllocation, runIntelligenceFoundation };
