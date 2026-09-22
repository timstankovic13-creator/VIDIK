'use strict';

const crypto = require('crypto');

const FAMILIES = Object.freeze([
  'prevention','early-intervention','direct-service','clinical','infrastructure','environmental',
  'enforcement','economic','information','system-capacity','policy','coordination'
]);
const CAUSAL_METHODS = new Set([
  'randomized-trial','cluster-randomized-trial','natural-experiment','difference-in-differences',
  'regression-discontinuity','instrumental-variable','matched-observational','longitudinal',
  'systematic-review','meta-analysis','quasi-experimental'
]);
const REQUIRED = Object.freeze(['causal','implementation','cost','equity']);
const text = v => String(v ?? '').trim();
const finite = v => typeof v === 'number' && Number.isFinite(v);
const positive = v => finite(v) && v > 0;
const unique = xs => [...new Set((Array.isArray(xs) ? xs : []).map(text).filter(Boolean))];
const hash = value => crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
function canonical(v) {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])]));
  return v;
}

function normalizeCandidate(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = text(raw.id);
  const name = text(raw.name || raw.title);
  if (!id || !name) return null;
  const families = unique(raw.families).filter(f => FAMILIES.includes(f));
  return {
    id, name, description:text(raw.description || raw.notes), mechanism:text(raw.mechanism),
    families, problemTags:unique(raw.problemTags || raw.tags), domains:unique(raw.domains),
    sourceIds:unique([raw.sourceId, raw.discovery?.sourceId, ...(raw.sourceIds || [])]),
    discoveryOnly:true, leadOnly:true, evidenceStatus:'potential',
    effectsImported:false, causalEffectImported:false
  };
}

function buildUniverseAudit(problem, records = [], expectedFamilies = FAMILIES) {
  const normalizedProblem = text(problem);
  if (!normalizedProblem) throw new Error('problem-required');
  const byKey = new Map();
  for (const raw of Array.isArray(records) ? records : []) {
    const c = normalizeCandidate(raw);
    if (!c) continue;
    const key = c.name.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const prior = byKey.get(key);
    if (!prior) byKey.set(key, c);
    else byKey.set(key, {
      ...prior,
      sourceIds:unique([...prior.sourceIds,...c.sourceIds]),
      families:unique([...prior.families,...c.families]),
      domains:unique([...prior.domains,...c.domains]),
      problemTags:unique([...prior.problemTags,...c.problemTags])
    });
  }
  const candidates = [...byKey.values()].sort((a,b)=>a.id.localeCompare(b.id));
  const families = unique(expectedFamilies).filter(f => FAMILIES.includes(f));
  const familyCoverage = families.map(f => ({family:f,candidateCount:candidates.filter(c=>c.families.includes(f)).length,represented:candidates.some(c=>c.families.includes(f))}));
  const missingFamilies = familyCoverage.filter(x=>!x.represented).map(x=>x.family);
  const unclassified = candidates.filter(c=>c.families.length===0).map(c=>c.id);
  const provenanceGaps = candidates.filter(c=>c.sourceIds.length===0).map(c=>c.id);
  const sourceIds = unique(candidates.flatMap(c=>c.sourceIds));
  return {
    schemaVersion:'vidik.intervention-universe-hardening.v1', problem:normalizedProblem,
    candidates, candidateCount:candidates.length, sourceIds, familyCoverage, missingFamilies, unclassified, provenanceGaps,
    completeness:{familyCoverageRate:families.length ? (families.length-missingFamilies.length)/families.length : 0, candidateCount:candidates.length, provenanceCoverageRate:candidates.length ? (candidates.length-provenanceGaps.length)/candidates.length : 0},
    searchRequired:candidates.length===0 || missingFamilies.length>0 || unclassified.length>0 || provenanceGaps.length>0,
    recommendationAllowed:false, effectsImported:false,
    auditHash:hash({problem:normalizedProblem,candidates,familyCoverage,provenanceGaps}),
    invariants:{unknownIsNotZero:true, discoveryCannotRecommend:true, effectsCannotImport:true}
  };
}

function planEvidence(universe, registry = [], evidenceIndex = {}) {
  if (!universe || universe.schemaVersion !== 'vidik.intervention-universe-hardening.v1') throw new Error('hardened-universe-required');
  const sources = (Array.isArray(registry) ? registry : []).filter(s=>s && text(s.id));
  const sourceMap = new Map(sources.map(s=>[text(s.id),s]));
  const plans = universe.candidates.map(c=>{
    const existing = evidenceIndex[c.id] && typeof evidenceIndex[c.id] === 'object' ? evidenceIndex[c.id] : {};
    const required = unique(existing.requiredEvidence || REQUIRED);
    const missing = required.filter(type => {
      const item = existing[type];
      if (!item || typeof item !== 'object') return true;
      if (type === 'causal') return item.status !== 'verified';
      return !['verified','supported'].includes(item.status);
    });
    const provenanceMissing = required.filter(type => {
      const item = existing[type];
      if (!item || typeof item !== 'object' || !text(item.sourceId)) return true;
      return !sourceMap.has(text(item.sourceId));
    });
    const rankedSources = sources.map(s=>{
      const types = unique(s.evidenceTypes || s.domains);
      const covers = missing.filter(t=>types.includes(t)||types.includes('all'));
      return {sourceId:text(s.id),authority:finite(s.authority)?s.authority:0,independenceGroup:text(s.independenceGroup)||text(s.id),covers};
    }).filter(s=>s.covers.length).sort((a,b)=>b.covers.length-a.covers.length||b.authority-a.authority||a.sourceId.localeCompare(b.sourceId));
    const groups = unique(rankedSources.map(s=>s.independenceGroup));
    const causalSources = rankedSources.filter(s=>s.covers.includes('causal'));
    return {candidateId:c.id,required,missing,provenanceMissing,status:(missing.length||provenanceMissing.length)?'acquisition-required':'evidence-ready',sourcePlans:rankedSources,causalSourceGroups:unique(causalSources.map(s=>s.independenceGroup)),independentSourceGroupsAvailable:groups.length,recommendationEligible:false};
  });
  return {schemaVersion:'vidik.evidence-acquisition-hardening.v1',candidatePlans:plans,blockedCount:plans.filter(p=>p.missing.length||p.provenanceMissing.length).length,sourceRegistryCount:sources.length,unknownIsNotZero:true,effectsImported:false,recommendationAllowed:false};
}

function causalGraph(candidate, evidence = []) {
  const rows = Array.isArray(evidence) ? evidence : [];
  const accepted=[]; const rejected=[]; const nodes=[{id:`intervention:${text(candidate?.id)}`,type:'intervention'}];
  const sourceGroups = new Map();
  for (const [index,e] of rows.entries()) {
    const method=text(e.causalMethod||e.method).toLowerCase();
    const sourceId=text(e.sourceId); const group=text(e.independenceGroup);
    const verified=e.verification?.status==='verified'; const effect=e.effect ?? e.effectEstimate; const unit=text(e.effectUnit||e.unit);
    if (!sourceId) { rejected.push({index,reason:'source-missing'}); continue; }
    if (!group) { rejected.push({index,reason:'independence-group-missing'}); continue; }
    if (sourceGroups.has(sourceId)) {
      rejected.push({index,reason:sourceGroups.get(sourceId)===group?'duplicate-source':'source-independence-conflict'}); continue;
    }
    if (!CAUSAL_METHODS.has(method)) { rejected.push({index,reason:'causal-method-not-admissible'}); continue; }
    if (!verified) { rejected.push({index,reason:'independent-verification-missing'}); continue; }
    if (!finite(effect)) { rejected.push({index,reason:'nonfinite-effect'}); continue; }
    if (!unit) { rejected.push({index,reason:'effect-unit-missing'}); continue; }
    const outcome=`outcome:${text(e.outcome||unit)}`;
    if (!nodes.some(n=>n.id===outcome)) nodes.push({id:outcome,type:'outcome',unit});
    sourceGroups.set(sourceId,group);
    accepted.push({index,sourceId,independenceGroup:group,method,effect,unit,outcome});
  }
  const groups=unique(accepted.map(x=>x.independenceGroup));
  const units=unique(accepted.map(x=>x.unit));
  return {schemaVersion:'vidik.causal-evidence-hardening.v1',nodes,accepted,rejected,independentSourceGroups:groups,sourceIds:unique(accepted.map(x=>x.sourceId)),effectUnits:units,causalReady:groups.length>=2&&units.length===1,effectTransferAllowed:false,parameterMutationAllowed:false,recommendationAllowed:false,auditHash:hash({nodes,accepted,rejected})};
}

function transferability(target={}, source={}, options={}) {
  const dims=['population','density','baselineRate','serviceCapacity','legalEnvironment','implementationModel','geography','climate','institutionalStructure'];
  const weights=options.weights||{}; const breakdown=[]; let total=0; let matched=0; let missingCritical=[]; let invalidDimensions=[];
  for(const d of dims){
    const w=positive(weights[d])?weights[d]:1; const tv=target[d], sv=source[d];
    if(tv===undefined||tv===null||sv===undefined||sv===null){breakdown.push({dimension:d,weight:w,similarity:null,observed:false}); missingCritical.push(d); continue;}
    if((typeof tv==='number'&&!finite(tv))||(typeof sv==='number'&&!finite(sv))){breakdown.push({dimension:d,weight:w,similarity:null,observed:false,invalid:true}); missingCritical.push(d); invalidDimensions.push(d); continue;}
    let sim=0;
    if(typeof tv==='number'&&typeof sv==='number'){const scale=Math.max(Math.abs(tv),Math.abs(sv),1);sim=Math.max(0,1-Math.abs(tv-sv)/scale);} else sim=text(tv).toLowerCase()===text(sv).toLowerCase()?1:0;
    total+=w; matched+=w*sim; breakdown.push({dimension:d,weight:w,similarity:sim,observed:true});
  }
  const score=total?matched/total:0;
  const legal=breakdown.find(x=>x.dimension==='legalEnvironment');
  const hardMismatch=legal?.observed && legal.similarity===0;
  const incomplete=missingCritical.length>0;
  const band=hardMismatch||invalidDimensions.length>0?'insufficient':incomplete?'low':score>=.8?'high':score>=.6?'moderate':score>=.4?'low':'insufficient';
  return {schemaVersion:'vidik.transferability-hardening.v1',score,band,breakdown,observedWeight:total,missingDimensions:missingCritical,invalidDimensions,comparable:band==='high'||band==='moderate',requiresLocalValidation:band!=='high'||missingCritical.length>0,effectTransferAllowed:false,parameterMutationAllowed:false,recommendationAllowed:false,hardMismatch};
}

function allocate(candidates=[],budget,options={}) {
  if(!finite(budget)||budget<0) throw new Error('valid-budget-required');
  const effectUnits=unique((Array.isArray(candidates)?candidates:[]).map(c=>text(c.effectUnit).toLowerCase()));
  const resourceUnits=unique((Array.isArray(candidates)?candidates:[]).map(c=>text(c.resourceUnit).toLowerCase()));
  if(effectUnits.length!==1||resourceUnits.length!==1||!effectUnits[0]||!resourceUnits[0]) return {schemaVersion:'vidik.resource-allocation-hardening.v1',blockedReason:'incomparable-or-missing-units',selected:[],remainingBudget:budget,recommendationAllowed:false};
  const rows=(Array.isArray(candidates)?candidates:[]).map(c=>({id:text(c.id),maxResource:positive(c.maxResource)?c.maxResource:0,step:positive(c.step)?c.step:1,fixedCost:finite(c.fixedCost)&&c.fixedCost>=0?c.fixedCost:0,effectAtMax:finite(c.effectAtMax)?c.effectAtMax:null})).filter(c=>c.id&&c.maxResource>0&&c.effectAtMax!==null&&c.effectAtMax>0);
  const selected=[]; let remaining=budget;
  for(const r of rows){
    if(remaining<r.fixedCost) continue;
    const available=Math.min(r.maxResource,remaining-r.fixedCost); if(available<=0) continue;
    const steps=Math.floor((available+1e-9)/r.step); if(steps<1) continue;
    const resource=Math.min(r.maxResource,steps*r.step); const curvature=positive(options.curvature)?options.curvature:.85;
    selected.push({candidateId:r.id,resource,resourceUnit:resourceUnits[0],effect:r.effectAtMax*Math.pow(resource/r.maxResource,curvature),effectUnit:effectUnits[0],fixedCost:r.fixedCost});
    remaining-=r.fixedCost+resource;
  }
  const totalEffect=selected.reduce((s,x)=>s+x.effect,0);
  return {schemaVersion:'vidik.resource-allocation-hardening.v1',budget,selected,totalEffect,remainingBudget:remaining,recommendationAllowed:false,opportunityCostVisible:true,optimality:'heuristic',optimalityGuaranteed:false};
}

module.exports={FAMILIES,CAUSAL_METHODS,buildUniverseAudit,planEvidence,causalGraph,transferability,allocate};
