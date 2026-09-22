'use strict';
const { test, expect } = require('@playwright/test');
const ceiling = require('../../js/evidence-ceiling-13.js');

const frozenCases = [
  ['001','HOUSING_FIRST_OTTAWA'],['002','AUTOMATED_SPEED_ENFORCEMENT_2024'],['003','PARAMEDIC_CAPACITY_2024'],
  ['004','OPS_FRONTLINE_STAFFING'],['005','OC_TRANSPO_SPECIAL_CONSTABLES'],['006','ANCHOR_PROTOTYPE'],['007','DOWNTOWN_SAFETY_OUTREACH'],
  ['008','YOUTH_SOCIAL_DEVELOPMENT'],['009','TRAFFIC_SAFETY_ACTION'],['010','RED_LIGHT_CAMERA'],['011','FIRE_RESPONSE_CAPACITY'],['012','COMMUNITY_PARAMEDIC_SUPPORTS']
];

function blockedEvaluation(id,candidate){
  const stages=['resource','capacity','activity'];
  const sources=stages.map((stage,i)=>({recordId:`C${id}-S${i+1}`,provider:'contemporaneous source family',url:'https://documents.ottawa.ca/',publishedAt:'2023-03-01'}));
  const claims=stages.map((stage,i)=>({claimId:`C${id}-${stage}`,candidateId:candidate,stage,sourceRecordId:sources[i].recordId,asOf:'2023-03-01'}));
  return ceiling.evaluate({decisionBoundary:'2023-12-06',candidates:[{candidateId:candidate}],sources,claims});
}

test('VIDIK Cases 001–014 complete blind batch — frozen 001–012 plus newly opened 013–014', async () => {
  for (const [id,candidate] of frozenCases) {
    const r=blockedEvaluation(id,candidate);
    expect(r.ok).toBe(true); expect(r.decision.status).toBe('NO RECOMMENDATION'); expect(r.decision.blocked).toBe(true);
    expect(Object.values(r.decision.gates)[0].recommendation).toBeNull();
    expect(Object.values(r.decision.gates)[0].missingStages).toEqual(['outcome','systemOutcome']);
  }

  const case013=ceiling.prepare({decisionBoundary:'2023-12-06',candidates:[{candidateId:'OPS_BODY_WORN_CAMERAS'}],sources:[{recordId:'C013-S1',provider:'Ottawa Police Service 2023 Budget',url:'https://www.ottawapolice.ca/',publishedAt:'2023-03-01'}],claims:[{claimId:'C013-resource',candidateId:'OPS_BODY_WORN_CAMERAS',stage:'resource',sourceRecordId:'C013-S1',asOf:'2023-03-01',temporalEligible:false}]});
  expect(case013.ok).toBe(false); expect(case013.reason).toBe('Evidence claim is explicitly temporally ineligible');

  const case014=blockedEvaluation('014','EMERGENCY_SHELTER_CAPACITY');
  expect(case014.ok).toBe(true); expect(case014.decision.status).toBe('NO RECOMMENDATION'); expect(case014.decision.blocked).toBe(true);
  expect(Object.values(case014.decision.gates)[0].missingStages).toEqual(['outcome','systemOutcome']);
});

test('Cases 013–014 reject post-boundary evidence', async () => {
  for (const candidate of ['OPS_BODY_WORN_CAMERAS','EMERGENCY_SHELTER_CAPACITY']) {
    const r=ceiling.prepare({decisionBoundary:'2023-12-06',candidates:[{candidateId:candidate}],sources:[{recordId:'POST',provider:'City of Ottawa',url:'https://ottawa.ca/',publishedAt:'2024-01-01'}],claims:[]});
    expect(r.ok).toBe(false); expect(r.reason).toBe('Source published after the decision boundary');
  }
});
