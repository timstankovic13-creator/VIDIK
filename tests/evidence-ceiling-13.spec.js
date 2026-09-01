const {test}=require('@playwright/test');
const assert=require('assert');
const m=require('../js/evidence-ceiling-13.js');

test('Case 001 evidence ceiling is fail-closed and auditable',()=>{
  const input={decisionBoundary:'2023-12-06',candidates:[{candidateId:'housing-first'},{candidateId:'ase'}],sources:[{recordId:'S01',provider:'City of Ottawa',url:'https://ottawa.ca/budget',publishedAt:'2023-11-08'},{recordId:'S03',provider:'At Home/Chez Soi',url:'https://www.mentalhealthcommission.ca/',publishedAt:'2014-01-01'}],claims:[
    {claimId:'r1',candidateId:'housing-first',stage:'resource',sourceRecordId:'S01',asOf:'2023-11-08'},
    {claimId:'c1',candidateId:'housing-first',stage:'capacity',sourceRecordId:'S01',asOf:'2023-11-08'},
    {claimId:'o1',candidateId:'housing-first',stage:'outcome',sourceRecordId:'S03',asOf:'2023-12-06'}
  ]};
  const e=m.evaluate(input);assert.equal(e.ok,true);assert.equal(e.decision.status,'NO RECOMMENDATION');assert.equal(e.decision.blocked,true);
  assert.deepEqual(e.decision.gates['housing-first'].missingStages,['activity','systemOutcome']);
  assert.equal(e.decision.gates['housing-first'].recommendation,null);
  assert.deepEqual(m.reopenCondition(e.decision,'housing-first').condition,'All missing stages must be satisfied by admissible candidate-specific evidence');
  assert.equal(m.prepare({...input,claims:[...input.claims,{claimId:'future',candidateId:'housing-first',stage:'activity',sourceRecordId:'S01',asOf:'2024-01-01'}]}).ok,false);
  assert.equal(m.prepare({...input,sources:[...input.sources,{recordId:'X',provider:'x',url:'http://example.com',publishedAt:'2023-01-01'}]}).ok,false);
});

test('complete marginal chain becomes eligible without inventing a recommendation',()=>{
  const stages=['resource','capacity','activity','outcome','systemOutcome'];
  const sources=stages.map((stage,i)=>({recordId:'S'+i,provider:'verified',url:'https://example.com/'+i,publishedAt:'2023-01-01'}));
  const claims=stages.map((stage,i)=>({claimId:'c'+i,candidateId:'housing-first',stage,sourceRecordId:'S'+i,asOf:'2023-01-01'}));
  const e=m.evaluate({decisionBoundary:'2023-12-06',candidates:[{candidateId:'housing-first'}],sources,claims});
  assert.equal(e.ok,true);assert.equal(e.decision.status,'READY FOR MODEL EVALUATION');assert.equal(e.decision.blocked,false);assert.equal(e.decision.gates['housing-first'].recommendation,'ELIGIBLE FOR MODEL EVALUATION');
});
