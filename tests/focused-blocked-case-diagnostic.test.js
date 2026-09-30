'use strict';
const test=require('node:test');
const {discoverSourceDrivenInterventions}=require('../js/source-driven-intervention-discovery');
const CASES=[
['municipal','US','reduce flood damage'],
['business','US','reduce customer churn'],
['community','US','reduce youth violence'],
['business','UK','improve hiring success'],
['business','CA','improve accessibility for customers with disabilities'],
['research','UK','evaluate ways to reduce hospital waiting times'],
['research','CA','study energy poverty interventions']
];
test('focused blocked-case diagnostic: preserve exact upstream failure evidence',async()=>{
 for(const [workspace,jurisdiction,problem] of CASES){
  const d=await discoverSourceDrivenInterventions({problem,jurisdiction,workspace,rows:4});
  console.log('VIDIK_BLOCKED_CASE',JSON.stringify({workspace,jurisdiction,problem,candidates:(d.candidates||[]).length,sourceSearches:(d.sourceSearches||[]).map(s=>({sourceId:s.sourceId,status:s.status,failedQueryCount:s.failedQueryCount,terminalFailure:s.terminalFailure,failureClasses:s.failureClasses,failureStages:s.failureStages,attempts:(s.attempts||[]).filter(a=>a.status==='search-failed').map(a=>({query:a.query,queryLayer:a.queryLayer,failureClass:a.failureClass,failureStage:a.failureStage,failureReason:a.failureReason,extractionDiagnostics:a.extractionDiagnostics||null}))}))},null,2));
 }
});