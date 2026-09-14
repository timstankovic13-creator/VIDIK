'use strict';

const crypto = require('crypto');
const { FAMILIES, assessFamilyRelevance, evaluateDiscoveryQuality, benchmarkNovelProblem, planEvidenceSearch, optimizeResourceAllocationExact } = require('./intelligence-validation');

const text = v => String(v ?? '').trim();
const finite = v => typeof v === 'number' && Number.isFinite(v);
const unique = xs => [...new Set((Array.isArray(xs) ? xs : []).map(text).filter(Boolean))];
function canonical(v){ if(Array.isArray(v)) return v.map(canonical); if(v&&typeof v==='object') return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])); return v; }
function hash(v){return crypto.createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');}

/** Build a blind benchmark envelope. Discovery receives only the public case, never the gold answer. */
function createBlindCase(caseInput = {}) {
  const problem = text(caseInput.problem);
  if(!problem) throw new Error('problem-required');
  const gold = caseInput.gold && typeof caseInput.gold === 'object' ? caseInput.gold : {};
  const publicCase = {
    caseId:text(caseInput.caseId) || hash(problem).slice(0,12),
    problem,
    context:caseInput.context && typeof caseInput.context === 'object' ? caseInput.context : {},
    discoveryHints:unique(caseInput.discoveryHints),
    hidden:true
  };
  const hiddenTruth = {
    candidateIds:unique(gold.candidateIds),
    families:unique(gold.families).filter(f=>FAMILIES.includes(f)),
    minimumCandidateRecall:finite(gold.minimumCandidateRecall)?gold.minimumCandidateRecall:0,
    minimumFamilyRecall:finite(gold.minimumFamilyRecall)?gold.minimumFamilyRecall:0
  };
  return {schemaVersion:'vidik.blind-case.v1',publicCase,hiddenTruth,truthHash:hash(hiddenTruth)};
}

/** Evaluate a completed blind run. Hidden truth is accepted only here and never forwarded to recommendation code. */
function evaluateBlindRun(blindCase, discovered = [], evidence = {}, acquisition = {}) {
  if(!blindCase || blindCase.schemaVersion!=='vidik.blind-case.v1') throw new Error('blind-case-required');
  const benchmark = benchmarkNovelProblem(blindCase.publicCase.problem, discovered, blindCase.hiddenTruth);
  const quality = evaluateDiscoveryQuality(discovered, blindCase.hiddenTruth);
  const provenanceCoverage = quality.provenanceCoverage;
  const evidenceCoverage = unique(evidence.verifiedCandidateIds).length && unique(blindCase.hiddenTruth.candidateIds).length
    ? unique(evidence.verifiedCandidateIds).filter(id=>blindCase.hiddenTruth.candidateIds.includes(id)).length / unique(blindCase.hiddenTruth.candidateIds).length : 0;
  const acquisitionExhausted = acquisition && acquisition.searchExhausted===true;
  const unexplainedMisses = blindCase.hiddenTruth.candidateIds.filter(id=>!unique(discovered.map(x=>x.id)).includes(id));
  return {
    schemaVersion:'vidik.blind-evaluation.v1', caseId:blindCase.publicCase.caseId,
    discovery:quality, evidenceCoverage, provenanceCoverage,
    unexplainedMisses, searchExhausted:acquisitionExhausted,
    pass:benchmark.pass && provenanceCoverage>=0.8,
    recommendationAllowed:false,
    evaluationOnly:true,
    truthHash:blindCase.truthHash
  };
}

/** Aggregate multiple domains without allowing an easy case to hide a failure on a hard case. */
function aggregateGeneralization(results = []) {
  const rows = Array.isArray(results) ? results.filter(Boolean) : [];
  const recalls = rows.map(r=>r.discovery?.candidate?.recall ?? 0);
  const familyRecalls = rows.map(r=>r.discovery?.family?.recall ?? 0);
  const passes = rows.filter(r=>r.pass===true).length;
  const worstCandidateRecall = recalls.length ? Math.min(...recalls) : 0;
  const worstFamilyRecall = familyRecalls.length ? Math.min(...familyRecalls) : 0;
  const meanCandidateRecall = recalls.length ? recalls.reduce((a,b)=>a+b,0)/recalls.length : 0;
  const meanFamilyRecall = familyRecalls.length ? familyRecalls.reduce((a,b)=>a+b,0)/familyRecalls.length : 0;
  return {
    schemaVersion:'vidik.generalization-scorecard.v1', caseCount:rows.length, passedCases:passes,
    passRate:rows.length?passes/rows.length:0, meanCandidateRecall, meanFamilyRecall,
    worstCandidateRecall, worstFamilyRecall,
    failureCases:rows.filter(r=>!r.pass).map(r=>r.caseId),
    recommendationAllowed:false,
    rule:'Generalization passes only if each blind case passes its own threshold; averages cannot mask a failed domain.'
  };
}

/** Detect common intelligence failure modes without turning them into recommendation authority. */
function adversarialIntelligenceAudit(run = {}) {
  const discovered = Array.isArray(run.discovered) ? run.discovered : [];
  const checks = {
    inventedEffects: discovered.some(c=>c.effectsImported===true || c.causalEffectImported===true),
    missingProvenance: discovered.some(c=>unique([c.sourceId,...(c.sourceIds||[])]).length===0),
    invalidFamilies: discovered.some(c=>Array.isArray(c.families) && c.families.some(f=>!FAMILIES.includes(f))),
    benchmarkLeakage: run.discovered?.some(c=>c.__gold===true)===true,
    prematureAuthority: run.recommendationAllowed===true
  };
  return {schemaVersion:'vidik.intelligence-adversarial-audit.v1',checks,pass:Object.values(checks).every(v=>v===false),recommendationAllowed:false};
}

function buildIntelligenceValidation(caseInput, discovered = [], evidence = {}, sourceRegistry = [], allocation = null){
  const blind = createBlindCase(caseInput);
  const relevance = assessFamilyRelevance(blind.publicCase.problem, discovered, {});
  const universe = {candidates:discovered};
  const evidencePlans = Array.isArray(evidence.plans)?evidence.plans:[];
  const acquisitionPlan = planEvidenceSearch(universe,evidencePlans,sourceRegistry,{maxQueries:24});
  const evaluation = evaluateBlindRun(blind,discovered,evidence, {searchExhausted:evidence.searchExhausted===true});
  const adversarial = adversarialIntelligenceAudit({discovered,recommendationAllowed:false});
  const allocationResult = allocation ? optimizeResourceAllocationExact(allocation.candidates||[],allocation.budget,allocation.options||{}) : null;
  return {
    schemaVersion:'vidik.intelligence-validation.v2', blindCase:blind.publicCase, relevance, acquisitionPlan,
    evaluation, adversarial, allocation:allocationResult, recommendationAllowed:false,
    auditHash:hash({blind:blind.publicCase,relevance,acquisitionPlan,evaluation,adversarial,allocation:allocationResult})
  };
}

module.exports={createBlindCase,evaluateBlindRun,aggregateGeneralization,adversarialIntelligenceAudit,buildIntelligenceValidation};
