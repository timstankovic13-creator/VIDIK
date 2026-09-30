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
test('remaining blocked first-40 cases: trace literature/comparable discovery',async()=>{
 for(const [workspace,jurisdiction,problem] of CASES){
  const d=await discoverSourceDrivenInterventions({problem,jurisdiction,workspace,rows:5});
  console.log('VIDIK_REMAINING_BLOCKED',JSON.stringify({
   workspace,jurisdiction,problem,candidates:(d.candidates||[]).map(c=>({name:c.name,families:c.interventionFamily,source:c.discovery?.source})),
   sourcesSelected:d.sourcesSelected,
   stoppingReason:d.interventionUniverse?.stoppingReason,
   missingFamilies:d.interventionUniverse?.missingInterventionFamilies,
   sourceSearches:(d.sourceSearches||[]).map(s=>({sourceId:s.sourceId,status:s.status,queriesAttempted:s.queriesAttempted,failedQueryCount:s.failedQueryCount,recordsConsidered:s.recordsConsidered,candidatesReturned:s.candidatesReturned,missingFamilies:s.missingFamilies,attempts:(s.attempts||[]).map(a=>({query:a.query,queryLayer:a.queryLayer,status:a.status,records:a.recordsConsidered,extracted:a.extractedCandidates,returned:a.candidatesReturned,relevanceRejected:a.relevanceRejectedCount,failureClass:a.failureClass,failureReason:a.failureReason}))}))
  },null,2));
 }
});