'use strict';

const crypto = require('crypto');

const FAMILIES = Object.freeze([
  'prevention','early-intervention','direct-service','clinical','infrastructure','environmental',
  'enforcement','economic','information','system-capacity','policy','coordination'
]);

const EVIDENCE_TYPES = Object.freeze(['causal','implementation','cost','equity']);
const DIMENSIONS = Object.freeze([
  'population','density','baselineRate','serviceCapacity','legalEnvironment',
  'implementationModel','geography','climate','institutionalStructure'
]);

const text = v => String(v ?? '').trim();
const finite = v => typeof v === 'number' && Number.isFinite(v);
const positive = v => finite(v) && v > 0;
const unique = xs => [...new Set((Array.isArray(xs) ? xs : []).map(text).filter(Boolean))];

function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])]));
  return v;
}
function hash(v) { return crypto.createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex'); }

/**
 * A: determine which intervention families are plausibly relevant without treating
 * the hypothesis as proof that an entire family was searched or that it is irrelevant.
 */
function assessFamilyRelevance(problem, candidates = [], signals = {}) {
  const p = text(problem).toLowerCase();
  if (!p) throw new Error('problem-required');
  const rules = {
    prevention: ['prevent','prevention','screening','early warning','risk reduction'],
    'early-intervention': ['early intervention','outreach','case finding','rapid response'],
    'direct-service': ['service','shelter','housing','support','outreach','access'],
    clinical: ['clinical','health','medical','treatment','overdose','mental health'],
    infrastructure: ['road','transit','building','infrastructure','technology','capital'],
    environmental: ['heat','flood','stormwater','drainage','pollution','environment','vacant lot'],
    enforcement: ['enforcement','inspection','compliance','deterrence','regulatory','police'],
    economic: ['income','employment','job','wage','subsidy','cash','incentive','price','rent'],
    information: ['education','information','training','navigation','messaging','awareness'],
    'system-capacity': ['capacity','staff','workforce','beds','response','throughput'],
    policy: ['policy','eligibility','standard','ordinance','rule','regulation'],
    coordination: ['coordination','partnership','network','multi-agency','community']
  };
  const records = Array.isArray(candidates) ? candidates : [];
  const explicit = signals && typeof signals === 'object' ? signals.relevantFamilies : [];
  const explicitFamilies = unique(explicit).filter(f => FAMILIES.includes(f));
  const hypotheses = FAMILIES.map(family => {
    const terms = rules[family] || [];
    const lexicalHits = terms.filter(term => p.includes(term));
    const candidateHits = records.filter(c => Array.isArray(c.families) && c.families.includes(family)).length;
    const explicitlyRelevant = explicitFamilies.includes(family);
    const status = explicitlyRelevant || lexicalHits.length || candidateHits ? 'plausibly-relevant' : 'not-yet-supported';
    return { family, status, lexicalSignals: lexicalHits, candidateCount:candidateHits, explicit:explicitlyRelevant };
  });
  const relevant = hypotheses.filter(h => h.status === 'plausibly-relevant').map(h => h.family);
  const untested = hypotheses.filter(h => h.status !== 'plausibly-relevant').map(h => h.family);
  return {
    schemaVersion:'vidik.family-relevance.v1', problem:text(problem), hypotheses,
    relevantFamilies:relevant, untestedFamilies:untested,
    authority:'hypothesis-only', recommendationAllowed:false,
    rule:'No family is treated as irrelevant merely because lexical discovery found no signal.'
  };
}

/**
 * B: turn evidence gaps into explicit search work, with source diversification and
 * value-of-information stopping rules. A plan is never evidence itself.
 */
function planEvidenceSearch(universe, evidencePlans = [], sourceRegistry = [], options = {}) {
  if (!universe || !Array.isArray(universe.candidates)) throw new Error('valid-universe-required');
  const registry = Array.isArray(sourceRegistry) ? sourceRegistry.filter(s => s && text(s.id)) : [];
  const plans = Array.isArray(evidencePlans) ? evidencePlans : [];
  const maxQueries = positive(options.maxQueries) ? Math.floor(options.maxQueries) : 12;
  const search = [];
  for (const candidate of universe.candidates) {
    const plan = plans.find(p => text(p.candidateId) === text(candidate.id)) || {};
    const missing = unique(plan.missing || plan.missingEvidence || EVIDENCE_TYPES);
    for (const type of missing) {
      const ranked = registry.map(source => {
        const types = unique(source.evidenceTypes || source.domains || []);
        const covers = types.includes(type) || types.includes('all');
        const authority = finite(source.authority) ? source.authority : 0;
        return {sourceId:text(source.id), independenceGroup:text(source.independenceGroup)||text(source.id), authority, covers};
      }).filter(x => x.covers).sort((a,b)=>b.authority-a.authority||a.sourceId.localeCompare(b.sourceId));
      search.push({
        candidateId:text(candidate.id), evidenceType:type,
        queryTerms:unique([candidate.name, candidate.description, ...(candidate.problemTags||[]), type]),
        preferredSources:ranked.slice(0, Math.max(1, Math.min(4, ranked.length))),
        independenceRequired:type === 'causal',
        stopWhen:type === 'causal' ? 'two independent verified causal source groups or documented search exhaustion' : 'verified or supported evidence with provenance and no unresolved conflict'
      });
    }
  }
  const limited = search.slice(0, maxQueries);
  return {
    schemaVersion:'vidik.evidence-search-plan.v1', searches:limited, totalRequiredSearches:search.length,
    truncated:search.length>limited.length, sourceDiversity:new Set(limited.flatMap(x=>x.preferredSources.map(s=>s.independenceGroup))).size,
    acquisitionRequired:search.length>0, recommendationAllowed:false,
    stoppingRule:'Stop only when required evidence is satisfied, additional search has low decision value, or documented source/search exhaustion is reached.',
    searchHash:hash(limited)
  };
}

/**
 * C/D: score a discovery run against a hidden/held-out benchmark. This measures
 * discovery quality without allowing benchmark truth to enter recommendation state.
 */
function evaluateDiscoveryQuality(discovered = [], benchmark = {}) {
  const rows = Array.isArray(discovered) ? discovered : [];
  const goldCandidates = unique(benchmark.candidateIds);
  const goldFamilies = unique(benchmark.families).filter(f => FAMILIES.includes(f));
  const discoveredIds = unique(rows.map(r => r.id));
  const discoveredFamilies = unique(rows.flatMap(r => Array.isArray(r.families) ? r.families : [])).filter(f => FAMILIES.includes(f));
  const tpCandidates = discoveredIds.filter(id => goldCandidates.includes(id)).length;
  const fpCandidates = discoveredIds.filter(id => !goldCandidates.includes(id)).length;
  const fnCandidates = goldCandidates.filter(id => !discoveredIds.includes(id)).length;
  const tpFamilies = discoveredFamilies.filter(f => goldFamilies.includes(f)).length;
  const fpFamilies = discoveredFamilies.filter(f => !goldFamilies.includes(f)).length;
  const fnFamilies = goldFamilies.filter(f => !discoveredFamilies.includes(f)).length;
  const precision = discoveredIds.length ? tpCandidates/discoveredIds.length : 0;
  const recall = goldCandidates.length ? tpCandidates/goldCandidates.length : 0;
  const familyPrecision = discoveredFamilies.length ? tpFamilies/discoveredFamilies.length : 0;
  const familyRecall = goldFamilies.length ? tpFamilies/goldFamilies.length : 0;
  const provenanceCoverage = rows.length ? rows.filter(r => unique([r.sourceId,...(r.sourceIds||[])].filter(Boolean)).length>0).length/rows.length : 0;
  return {
    schemaVersion:'vidik.discovery-quality.v1', candidate:{precision,recall,falsePositiveCount:fpCandidates,falseNegativeCount:fnCandidates},
    family:{precision:familyPrecision,recall:familyRecall,falsePositiveCount:fpFamilies,falseNegativeCount:fnFamilies},
    provenanceCoverage, benchmarkCandidateCount:goldCandidates.length, benchmarkFamilyCount:goldFamilies.length,
    authority:'evaluation-only', recommendationAllowed:false
  };
}

function benchmarkNovelProblem(problem, discovered = [], benchmark = {}) {
  const quality = evaluateDiscoveryQuality(discovered, benchmark);
  return {
    schemaVersion:'vidik.novel-problem-benchmark.v1', problem:text(problem), quality,
    unseenProblem:true, truthHiddenFromDiscovery:true, recommendationAllowed:false,
    pass:quality.candidate.recall >= Number(benchmark.minimumCandidateRecall ?? 0) && quality.family.recall >= Number(benchmark.minimumFamilyRecall ?? 0)
  };
}

/**
 * E: exact discrete allocation. The model is exact over the supplied step grid,
 * including fixed costs and nonlinear returns; it does not claim continuous optimality.
 */
function optimizeResourceAllocationExact(candidates = [], budget, options = {}) {
  if (!finite(budget) || budget < 0) throw new Error('valid-budget-required');
  const rows = (Array.isArray(candidates) ? candidates : []).map(c => ({
    id:text(c.id), effectUnit:text(c.effectUnit).toLowerCase(), resourceUnit:text(c.resourceUnit).toLowerCase(),
    maxResource:positive(c.maxResource)?c.maxResource:0, step:positive(c.step)?c.step:0,
    fixedCost:finite(c.fixedCost)&&c.fixedCost>=0?c.fixedCost:0,
    effectAtMax:finite(c.effectAtMax)&&c.effectAtMax>0?c.effectAtMax:null
  })).filter(r=>r.id&&r.maxResource>0&&r.step>0&&r.effectAtMax!==null&&r.effectUnit&&r.resourceUnit);
  const effectUnits=unique(rows.map(r=>r.effectUnit)); const resourceUnits=unique(rows.map(r=>r.resourceUnit));
  if(effectUnits.length!==1||resourceUnits.length!==1) return {schemaVersion:'vidik.resource-allocation-exact.v1',blockedReason:'incomparable-or-missing-units',selected:[],recommendationAllowed:false};
  const quantum=options.quantum && positive(options.quantum) ? options.quantum : Math.min(...rows.map(r=>r.step));
  if(!finite(quantum)||quantum<=0) throw new Error('invalid-quantum');
  const scale=v=>Math.round(v/quantum);
  const budgetUnits=scale(budget);
  const states=new Map([[0,{effect:0,allocations:[]}]]);
  const curvature=positive(options.curvature)?options.curvature:0.85;
  const marginalEffect=(row,resource)=>row.effectAtMax*Math.pow(Math.min(1,resource/row.maxResource),curvature);
  for(const row of rows){
    const next=new Map(states);
    const maxUnits=scale(row.maxResource);
    const fixedUnits=scale(row.fixedCost);
    for(const [used,state] of states.entries()){
      for(let units=scale(row.step); units<=maxUnits; units+=scale(row.step)){
        const cost=fixedUnits+units;
        if(used+cost>budgetUnits) break;
        const resource=units*quantum;
        const effect=marginalEffect(row,resource);
        const key=used+cost;
        const candidate={effect:state.effect+effect,allocations:[...state.allocations,{candidateId:row.id,resource,effect,effectUnit:row.effectUnit,resourceUnit:row.resourceUnit,fixedCost:row.fixedCost}]};
        const prior=next.get(key);
        if(!prior||candidate.effect>prior.effect+1e-12) next.set(key,candidate);
      }
    }
    states.clear(); for(const [k,v] of next.entries()) states.set(k,v);
  }
  let best={effect:0,allocations:[],used:0};
  for(const [used,state] of states.entries()) if(state.effect>best.effect+1e-12) best={...state,used};
  return {
    schemaVersion:'vidik.resource-allocation-exact.v1', budget, selected:best.allocations,
    totalEffect:best.effect, remainingBudget:Math.max(0,budget-best.used*quantum),
    optimality:'exact-discrete-step-grid', optimalityGuaranteed:true, quantum,
    effectUnit:effectUnits[0],resourceUnit:resourceUnits[0],recommendationAllowed:false
  };
}

module.exports={FAMILIES,EVIDENCE_TYPES,DIMENSIONS,assessFamilyRelevance,planEvidenceSearch,evaluateDiscoveryQuality,benchmarkNovelProblem,optimizeResourceAllocationExact};
