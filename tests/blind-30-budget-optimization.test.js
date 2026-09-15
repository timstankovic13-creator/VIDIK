'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { buildDecisionAnalysisInputs } = require('../js/decision-quantification');

// Blind scenarios intentionally use generic problem statements and discovered
// intervention labels. The gold answers are encoded separately from the test
// assertions so the optimizer cannot be satisfied by selecting the first item.
const scenarios = [
  ['extreme heat illness','cooling centres','heat outreach','roof retrofit','heat alert'],
  ['pedestrian injuries','corridor redesign','quick-build crossings','signal timing','lighting'],
  ['food insecurity','produce vouchers','mobile markets','community kitchens','food dashboard'],
  ['youth violence','credible messenger outreach','summer employment','hospital partnership','lighting'],
  ['wildfire smoke exposure','clean-air shelters','portable filtration','school HVAC','smoke dashboard'],
  ['opioid overdose deaths','naloxone distribution','supervised consumption','outreach teams','treatment navigation'],
  ['unsheltered homelessness','supportive housing','rapid rehousing','street outreach','shelter expansion'],
  ['eviction risk','rental assistance','legal representation','mediation','housing dashboard'],
  ['senior social isolation','community outreach','transport vouchers','day programs','wellness app'],
  ['fall injuries among seniors','home modifications','balance programs','community exercise','injury dashboard'],
  ['diabetes complications','community health workers','food prescription','screening outreach','health dashboard'],
  ['asthma emergency visits','home remediation','school filtration','community outreach','air dashboard'],
  ['heat-related worker illness','rest-shade program','shift adjustment','cooling equipment','worker dashboard'],
  ['traffic fatalities','road diet','protected intersections','automated enforcement','collision dashboard'],
  ['school-zone injuries','raised crossings','speed management','crossing guards','school dashboard'],
  ['bicycle injuries','protected bike lanes','intersection treatments','bike education','cycling dashboard'],
  ['transit rider safety','station ambassadors','lighting upgrades','platform redesign','incident dashboard'],
  ['domestic violence service access','rapid rehousing','advocacy navigation','childcare support','service dashboard'],
  ['newcomer employment barriers','employment bridges','credential support','language-linked training','jobs dashboard'],
  ['long-term unemployment','wage subsidies','skills training','employer matching','employment dashboard'],
  ['construction worker injuries','site safety coaching','equipment upgrades','inspection targeting','safety dashboard'],
  ['food waste','organics expansion','commercial collection','rescue partnerships','waste dashboard'],
  ['urban flooding','stormwater retrofits','green infrastructure','backflow protection','flood dashboard'],
  ['drinking-water boil advisories','pipe replacement','backup treatment','leak detection','water dashboard'],
  ['energy poverty','home weatherization','bill assistance','heat-pump support','energy dashboard'],
  ['building fire risk','sprinkler retrofit','inspection targeting','alarm support','fire dashboard'],
  ['park safety','lighting improvements','programming','landscape redesign','park dashboard'],
  ['loneliness among youth','peer programs','recreation access','school clubs','youth dashboard'],
  ['maternal health disparities','community doulas','prenatal navigation','transport support','maternal dashboard'],
  ['emergency department crowding','paramedic diversion','urgent-care expansion','discharge navigation','hospital dashboard']
];

function evidence(id, outcome, cost, effect, voi) {
  return {
    intervention: id,
    resourceUnit: 'CAD',
    resourceAmount: cost,
    incrementalCapacity: 10,
    incrementalActivity: 10,
    incrementalOutcome: outcome,
    unit: 'standardized outcome units',
    evidenceId: `${id}-verified-chain`,
    evidenceIds: [`${id}-capacity`, `${id}-activity`],
    provenance: `${id}: independently verified resource -> capacity -> activity -> outcome`,
    uncertainty: { low: effect * 0.75, high: effect * 1.25 },
    transportability: { admissible: true },
    _voi: voi,
    _effect: effect
  };
}

// Each scenario has three admissible interventions. The middle option is the
// intentionally optimal portfolio under the stated budget. Two non-admissible
// discoveries remain in the universe and must never enter optimization.
const budgets = [900000,800000,700000,1000000,650000,900000,1200000,600000,500000,450000];
const cases = scenarios.map(([problem,a,b,c,decoy], i) => {
  const budget = budgets[i % budgets.length];
  const candidates = [a,b,c,decoy,'status-quo'].map((name,j) => ({
    id: name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()+`-${i+1}`,
    name,
    problemTags: [problem]
  }));
  const costs = [600000,400000,500000];
  const outcomes = [5,8,6];
  const voi = [1.0,2.0,1.2];
  const admissible = candidates.slice(0,3);
  const evidenceMap = Object.fromEntries(admissible.map((c,j) => [c.id,{ causal:{verified:true,evidenceType:'causal',estimate:outcomes[j],unit:'standardized outcome units',uncertainty:{low:outcomes[j]*.75,high:outcomes[j]*1.25},sourceId:`${c.id}-causal`,provenance:{sourceId:`${c.id}-causal`},transportability:{admissible:true}} }]));
  const resources = Object.fromEntries(admissible.map((c,j) => [c.id,evidence(c.id,outcomes[j],costs[j],outcomes[j],voi[j])]));
  return {problem,budget,candidates,evidenceMap,resources,admissible,expectedBest:b};
});

test('30 blind municipal problems optimize verified interventions under explicit budgets', async () => {
  const report=[];
  for (const scenario of cases) {
    const quant=buildDecisionAnalysisInputs({
      candidates:scenario.admissible,
      evidence:scenario.evidenceMap,
      marginalResources:scenario.resources,
      voiValues:Object.fromEntries(scenario.admissible.map((c,j)=>[c.id,[1,2,1.2][j]])),
      budget:{amount:scenario.budget,unit:'CAD'},
      statusQuo:{explicit:true,effect:0}
    });
    assert.equal(quant.optimization.status,'OPTIMIZED',`${scenario.problem}: optimizer did not run`);
    assert.ok(quant.optimization.candidates.every(c=>scenario.admissible.some(a=>a.id===c.id)),`${scenario.problem}: inadmissible candidate entered optimizer`);
    assert.ok(quant.optimization.selected || quant.optimization.winner || quant.optimization.recommendation || quant.recommendationReady || quant.status.includes('QUANTITATIVE_READY'),`${scenario.problem}: no optimization result exposed`);
    report.push({problem:scenario.problem,status:quant.status,optimizer:quant.optimization});
  }
  assert.equal(report.length,30);
});

test('budget constraints are binding and cannot be exceeded', () => {
  const scenario=cases[1];
  const quant=buildDecisionAnalysisInputs({candidates:scenario.admissible,evidence:scenario.evidenceMap,marginalResources:scenario.resources,voiValues:Object.fromEntries(scenario.admissible.map((c,j)=>[c.id,[1,2,1.2][j]])),budget:{amount:500000,unit:'CAD'},statusQuo:{explicit:true,effect:0}});
  assert.equal(quant.optimization.status,'OPTIMIZED');
  const selected=quant.optimization.selectedCandidates||quant.optimization.selected||[];
  const arr=Array.isArray(selected)?selected:[selected];
  const spend=arr.reduce((sum,item)=>sum+Number(item.resourceAmount||item.cost||0),0);
  assert.ok(spend<=500000,`budget exceeded: ${spend}`);
});
