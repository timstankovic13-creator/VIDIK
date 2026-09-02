'use strict';

const SCENARIOS = Object.freeze([
  'BASELINE',
  'REMOVE_STRONGEST_EVIDENCE',
  'WIDEN_UNCERTAINTY',
  'ADD_CORRELATED_ERROR',
  'EVIDENCE_CONFLICT',
  'TRANSPORTABILITY_PENALTY',
  'STALE_EVIDENCE',
  'PRIORITY_SHIFT',
  'STATUS_QUO_STRENGTHENED',
  'ALTERNATIVE_STRENGTHENED'
]);

function validateScores(scores) {
  if (!scores || typeof scores !== 'object') return {ok:false, reason:'Candidate scores are required'};
  const entries = Object.entries(scores);
  if (entries.length < 2) return {ok:false, reason:'At least two candidates are required'};
  for (const [id, value] of entries) {
    if (!id || !Number.isFinite(value)) return {ok:false, reason:'Every candidate score must be finite'};
  }
  return {ok:true};
}

function recommend(scores) {
  const v = validateScores(scores);
  if (!v.ok) return v;
  const ordered = Object.entries(scores).sort((a,b)=>b[1]-a[1]);
  return {ok:true, candidateId:ordered[0][0], score:ordered[0][1], margin:ordered[0][1]-ordered[1][1]};
}

function stressTest({baselineScores, scenarios}) {
  const base = recommend(baselineScores);
  if (!base.ok) return base;
  const requested = Array.isArray(scenarios) && scenarios.length ? scenarios : SCENARIOS;
  const results = [];
  for (const scenario of requested) {
    if (!scenario || typeof scenario !== 'object' || !scenario.scores) return {ok:false, reason:'Each stress scenario requires scores'};
    const result = recommend(scenario.scores);
    if (!result.ok) return result;
    results.push({name:scenario.name || 'UNNAMED', recommendation:result.candidateId, margin:result.margin, flips:result.candidateId!==base.candidateId});
  }
  const flips = results.filter(r=>r.flips).map(r=>r.name);
  return {ok:true,baseline:base,recommendationStable:flips.length===0,flips,results,scenariosRun:results.length};
}

function outcomeLearningGate({decisionId,decisionSnapshotHash,baseline,checkpoints,observations}) {
  const failures=[];
  if(!decisionId) failures.push('decision-id-missing');
  if(!decisionSnapshotHash) failures.push('immutable-decision-snapshot-missing');
  if(!baseline || !baseline.metric || !Number.isFinite(baseline.value)) failures.push('baseline-missing');
  const cps=Array.isArray(checkpoints)?checkpoints:[];
  for(const required of [0.5,1,2,5]) if(!cps.some(c=>c.years===required)) failures.push(`checkpoint-${required}y-missing`);
  if(!Array.isArray(observations)||!observations.length) failures.push('observations-missing');
  return {eligible:failures.length===0,failures,preservesOriginalDecision:Boolean(decisionSnapshotHash)};
}

module.exports=Object.freeze({SCENARIOS,recommend,stressTest,outcomeLearningGate});
