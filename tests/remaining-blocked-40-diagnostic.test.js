'use strict';
const test=require('node:test');
const {discoverSourceDrivenInterventions}=require('../js/source-driven-intervention-discovery');
const CASES=[
['municipal','US','reduce eviction filings'],
['municipal','AU','reduce bushfire smoke exposure'],
['business','US','reduce customer churn'],
['business','CA','reduce energy costs'],
['business','AU','reduce delivery delays'],
['community','CA','improve food access'],
['community','US','improve disaster preparedness'],
['community','US','reduce heat exposure']
];

async function runCase([workspace,jurisdiction,problem]){
  const d=await discoverSourceDrivenInterventions({problem,jurisdiction,workspace,rows:5});
  return {workspace,jurisdiction,problem,candidateCount:(d.candidates||[]).length,candidates:(d.candidates||[]).map(c=>c.name),sources:(d.sourceSearches||[]).map(s=>({sourceId:s.sourceId,status:s.status,failedQueryCount:s.failedQueryCount,candidatesReturned:s.candidatesReturned,failed:(s.attempts||[]).filter(a=>a.status==='search-failed').length})),discoveryState:d.interventionUniverse?.stoppingReason};
}

test('remaining blocked first-40 cases: trace literature/comparable discovery',async()=>{
 for(const c of CASES){
  const d=await runCase(c);
  console.log('VIDIK_REMAINING_BLOCKED',JSON.stringify(d,null,2));
 }
});

test('blocked-case concurrency differential: sequential versus parallel discovery',async()=>{
 const sequential=[];
 for(const c of CASES) sequential.push(await runCase(c));
 const parallel=await Promise.all(CASES.map(c=>runCase(c)));
 const byProblem=new Map(sequential.map(r=>[r.problem,r]));
 const differential=parallel.map(r=>{
   const s=byProblem.get(r.problem);
   return {workspace:r.workspace,jurisdiction:r.jurisdiction,problem:r.problem,sequentialCandidates:s.candidateCount,parallelCandidates:r.candidateCount,candidateDelta:r.candidateCount-s.candidateCount,sequentialFailures:s.sources.reduce((n,x)=>n+x.failed,0),parallelFailures:r.sources.reduce((n,x)=>n+x.failed,0),parallelSources:r.sources};
 });
 console.log('VIDIK_CONCURRENCY_DIFFERENTIAL',JSON.stringify(differential,null,2));
});