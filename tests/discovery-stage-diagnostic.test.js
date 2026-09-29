'use strict';
const test = require('node:test');
const { discoverSourceDrivenInterventions, interventionMatchesProblem } = require('../js/source-driven-intervention-discovery');

const CASES = [
['municipal','CA','reduce violent crime'],['municipal','CA','reduce pedestrian injuries'],['municipal','CA','reduce emergency department overcrowding'],['municipal','CA','reduce homelessness'],['municipal','CA','reduce food insecurity'],['municipal','CA','reduce extreme heat illness'],['municipal','CA','reduce wildfire smoke exposure'],['municipal','CA','reduce traffic congestion'],['municipal','CA','reduce construction permitting delays'],['municipal','CA','reduce residential energy burden'],['municipal','CA','reduce opioid overdose deaths'],['municipal','CA','improve access to affordable childcare'],['municipal','US','reduce gun violence'],['municipal','US','reduce school absenteeism'],['municipal','US','reduce flood damage'],['municipal','US','improve transit reliability'],['municipal','US','reduce eviction filings'],['municipal','UK','reduce rough sleeping'],['municipal','UK','reduce air pollution'],['municipal','AU','reduce bushfire smoke exposure'],
['business','US','improve small business survival'],['business','US','reduce customer churn'],['business','US','reduce employee turnover'],['business','US','reduce workplace injuries'],['business','CA','reduce supply chain disruption'],['business','CA','reduce energy costs'],['business','UK','improve hiring success'],['business','AU','reduce delivery delays'],['business','US','increase employee training completion'],['business','CA','improve accessibility for customers with disabilities'],
['community','CA','improve food access'],['community','CA','reduce social isolation among seniors'],['community','CA','improve newcomer employment'],['community','CA','increase access to affordable housing'],['community','US','reduce youth violence'],['community','US','improve disaster preparedness'],['community','US','reduce heat exposure'],['community','UK','improve mental health service access'],['community','AU','reduce wildfire evacuation barriers'],['community','AU','improve rural healthcare access'],
['research','UK','evaluate interventions to reduce homelessness'],['research','UK','evaluate ways to reduce hospital waiting times'],['research','UK','evaluate interventions for food insecurity'],['research','UK','study effective heat-health interventions'],['research','US','study interventions to reduce pedestrian injuries'],['research','US','study workforce displacement from automation'],['research','CA','study interventions for opioid overdose prevention'],['research','CA','study energy poverty interventions'],['research','AU','study wildfire smoke mitigation'],['research','AU','study interventions to improve rural mobility'],
['enterprise','US','reduce digital access gaps'],['enterprise','US','reduce cybersecurity incident risk'],['enterprise','US','reduce procurement cycle time'],['enterprise','CA','reduce employee burnout'],['enterprise','CA','improve remote service delivery'],['enterprise','UK','reduce regulatory compliance delays'],['enterprise','UK','improve data governance'],['enterprise','AU','reduce infrastructure maintenance backlog'],['enterprise','AU','improve emergency response coordination'],['enterprise','CA','reduce accessibility barriers in digital services']
];

test('diagnostic: classify every 60-case discovery loss point', async () => {
  const rows=[];
  for (const [workspace,jurisdiction,problem] of CASES) {
    const d=await discoverSourceDrivenInterventions({problem,jurisdiction,workspace,rows:4});
    const candidates=d.candidates||[];
    const relevant=candidates.filter(c=>interventionMatchesProblem(problem,c,workspace));
    const searches=d.sourceSearches||[];
    const stageCounts={sourceSelection:0,retrievalFailure:0,emptyRetrieval:0,extractionLoss:0,relevanceRejection:0,familyOrDedupLoss:0,success:0};
    if(!searches.length) stageCounts.sourceSelection=1;
    for(const s of searches){
      if(s.status==='search-failed') stageCounts.retrievalFailure++;
      else if((s.recordsConsidered||0)===0) stageCounts.emptyRetrieval++;
      for(const a of (s.attempts||[])){
        if(a.status==='search-failed') continue;
        const records=a.recordsConsidered||0, extracted=a.extractedCandidates||0, rejected=a.relevanceRejectedCount||0, kept=a.candidatesReturned||0;
        if(records>0 && extracted===0) stageCounts.extractionLoss++;
        else if(extracted>0 && rejected>0 && kept===0) stageCounts.relevanceRejection++;
      }
    }
    if(candidates.length===0 && searches.some(s=>s.candidatesReturned>0)) stageCounts.familyOrDedupLoss=1;
    if(relevant.length>0) stageCounts.success=1;
    rows.push({workspace,jurisdiction,problem,candidates:candidates.length,relevant:relevant.length,stageCounts,
      sourceStatuses:searches.map(s=>({sourceId:s.sourceId,status:s.status,records:s.recordsConsidered||0,returned:s.candidatesReturned||0,failed:s.failedQueryCount||0}))});
  }
  const totals={cases:rows.length,casesWithRelevant:rows.filter(r=>r.relevant>0).length,casesWithCandidates:rows.filter(r=>r.candidates>0).length};
  for(const k of ['retrievalFailure','emptyRetrieval','extractionLoss','relevanceRejection','familyOrDedupLoss']) totals[k]=rows.reduce((n,r)=>n+r.stageCounts[k],0);
  console.log('VIDIK_DIAGNOSTIC_JSON_START');
  console.log(JSON.stringify({totals,rows},null,2));
  console.log('VIDIK_DIAGNOSTIC_JSON_END');
});
