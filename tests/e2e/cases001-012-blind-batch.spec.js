'use strict';
const { test, expect } = require('@playwright/test');
const ceiling = require('../../js/evidence-ceiling-13.js');

const cases = [
  ['001','HOUSING_FIRST_OTTAWA',['resource','capacity','activity']],
  ['002','AUTOMATED_SPEED_ENFORCEMENT_2024',['resource','capacity','activity']],
  ['003','PARAMEDIC_CAPACITY_2024',['resource','capacity','activity']],
  ['004','OPS_FRONTLINE_STAFFING',['resource','capacity','activity']],
  ['005','OC_TRANSPO_SPECIAL_CONSTABLES',['resource','capacity','activity']],
  ['006','ANCHOR_PROTOTYPE',['resource','capacity','activity']],
  ['007','DOWNTOWN_SAFETY_OUTREACH',['resource','capacity','activity']],
  ['008','YOUTH_SOCIAL_DEVELOPMENT',['resource','capacity','activity']],
  ['009','TRAFFIC_SAFETY_ACTION',['resource','capacity','activity']],
  ['010','RED_LIGHT_CAMERA',['resource','capacity','activity']],
  ['011','FIRE_RESPONSE_CAPACITY',['resource','capacity','activity']],
  ['012','COMMUNITY_PARAMEDIC_SUPPORTS',['resource','capacity','activity']]
];

function runCase([id,candidate,stages]) {
  const sources = stages.map((stage,i)=>({recordId:`C${id}-S${i+1}`,provider:'City of Ottawa / contemporaneous source family',url:'https://documents.ottawa.ca/',publishedAt:'2023-03-01'}));
  const claims = stages.map((stage,i)=>({claimId:`C${id}-${stage}`,candidateId:candidate,stage,sourceRecordId:sources[i].recordId,asOf:'2023-03-01'}));
  return ceiling.evaluate({decisionBoundary:'2023-12-06',candidates:[{candidateId:candidate}],sources,claims});
}

test('VIDIK Cases 001–012 blind evidence batch — frozen temporal boundary and fail-closed recommendations', async () => {
  const outputs = cases.map(runCase);
  for (const r of outputs) {
    expect(r.ok).toBe(true);
    expect(r.decision.decisionBoundary).toBe('2023-12-06');
    expect(r.decision.status).toBe('NO RECOMMENDATION');
    expect(r.decision.blocked).toBe(true);
    const gate = Object.values(r.decision.gates)[0];
    expect(gate.recommendation).toBeNull();
    expect(gate.missingStages).toEqual(['outcome','systemOutcome']);
  }
  expect(outputs).toHaveLength(12);
  console.log('VIDIK_CASES_001_012_BLIND_FREEZE ' + JSON.stringify(outputs.map(r => ({candidate:Object.values(r.decision.gates)[0].candidateId,status:r.decision.status,missing:Object.values(r.decision.gates)[0].missingStages}))));
});

test('VIDIK Cases 004–012 reject post-boundary executable evidence', async () => {
  for (const [id,candidate] of cases.filter(c => Number(c[0]) >= 4)) {
    const r = ceiling.prepare({decisionBoundary:'2023-12-06',candidates:[{candidateId:candidate}],sources:[{recordId:`POST-${id}`,provider:'City of Ottawa',url:'https://ottawa.ca/',publishedAt:'2024-01-01'}],claims:[]});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('Source published after the decision boundary');
  }
});
