'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { discoverSourceDrivenInterventions, taxonomyTerms, isActionableInterventionTitle, interventionMatchesProblem, expectedInterventionFamilies, discoveryCoverage, buildDiscoveryQueries } = require('../js/source-driven-intervention-discovery');
const { discoverCandidateEvidence, discoverCandidateUniverseEvidence, queryFor, evidenceLeadRelevance, extractPubmedAbstracts } = require('../js/source-driven-evidence-discovery');

const CASES = [
  // Municipal / public sector
  ['municipal','CA','reduce violent crime'],
  ['municipal','CA','reduce pedestrian injuries'],
  ['municipal','CA','reduce emergency department overcrowding'],
  ['municipal','CA','reduce homelessness'],
  ['municipal','CA','reduce food insecurity'],
  ['municipal','CA','reduce extreme heat illness'],
  ['municipal','CA','reduce wildfire smoke exposure'],
  ['municipal','CA','reduce traffic congestion'],
  ['municipal','CA','reduce construction permitting delays'],
  ['municipal','CA','reduce residential energy burden'],
  ['municipal','CA','reduce opioid overdose deaths'],
  ['municipal','CA','improve access to affordable childcare'],
  ['municipal','US','reduce gun violence'],
  ['municipal','US','reduce school absenteeism'],
  ['municipal','US','reduce flood damage'],
  ['municipal','US','improve transit reliability'],
  ['municipal','US','reduce eviction filings'],
  ['municipal','UK','reduce rough sleeping'],
  ['municipal','UK','reduce air pollution'],
  ['municipal','AU','reduce bushfire smoke exposure'],
  // Business
  ['business','US','improve small business survival'],
  ['business','US','reduce customer churn'],
  ['business','US','reduce employee turnover'],
  ['business','US','reduce workplace injuries'],
  ['business','CA','reduce supply chain disruption'],
  ['business','CA','reduce energy costs'],
  ['business','UK','improve hiring success'],
  ['business','AU','reduce delivery delays'],
  ['business','US','increase employee training completion'],
  ['business','CA','improve accessibility for customers with disabilities'],
  // Community
  ['community','CA','improve food access'],
  ['community','CA','reduce social isolation among seniors'],
  ['community','CA','improve newcomer employment'],
  ['community','CA','increase access to affordable housing'],
  ['community','US','reduce youth violence'],
  ['community','US','improve disaster preparedness'],
  ['community','US','reduce heat exposure'],
  ['community','UK','improve mental health service access'],
  ['community','AU','reduce wildfire evacuation barriers'],
  ['community','AU','improve rural healthcare access'],
  // Research
  ['research','UK','evaluate interventions to reduce homelessness'],
  ['research','UK','evaluate ways to reduce hospital waiting times'],
  ['research','UK','evaluate interventions for food insecurity'],
  ['research','UK','study effective heat-health interventions'],
  ['research','US','study interventions to reduce pedestrian injuries'],
  ['research','US','study workforce displacement from automation'],
  ['research','CA','study interventions for opioid overdose prevention'],
  ['research','CA','study energy poverty interventions'],
  ['research','AU','study wildfire smoke mitigation'],
  ['research','AU','study interventions to improve rural mobility'],
  // Enterprise
  ['enterprise','US','reduce digital access gaps'],
  ['enterprise','US','reduce cybersecurity incident risk'],
  ['enterprise','US','reduce procurement cycle time'],
  ['enterprise','CA','reduce employee burnout'],
  ['enterprise','CA','improve remote service delivery'],
  ['enterprise','UK','reduce regulatory compliance delays'],
  ['enterprise','UK','improve data governance'],
  ['enterprise','AU','reduce infrastructure maintenance backlog'],
  ['enterprise','AU','improve emergency response coordination'],
  ['enterprise','CA','reduce accessibility barriers in digital services'],  // Additional open-world generalization cases — deliberately outside the original 60
  ['municipal','CA','reduce tenant displacement'],
  ['municipal','US','reduce ambulance response times'],
  ['municipal','US','increase residential water conservation'],
  ['municipal','UK','reduce school exclusion'],
  ['municipal','AU','improve stormwater resilience'],
  ['municipal','CA','reduce street homelessness among people with complex needs'],
  ['municipal','US','reduce repeat domestic violence'],
  ['municipal','UK','increase household energy efficiency'],
  ['business','US','reduce failed software deployments'],
  ['business','CA','reduce invoice processing time'],
  ['business','UK','improve customer complaint resolution'],
  ['business','AU','reduce warehouse picking errors'],
  ['business','US','improve first-year employee retention'],
  ['business','CA','reduce product return rates'],
  ['business','UK','reduce employee absenteeism'],
  ['business','AU','improve field-service scheduling'],
  ['community','CA','reduce newcomer language barriers'],
  ['community','US','increase access to primary care'],
  ['community','UK','reduce loneliness among young adults'],
  ['community','AU','improve evacuation readiness for remote communities'],
  ['community','CA','reduce barriers to legal assistance'],
  ['community','US','improve access to disability employment supports'],
  ['community','UK','reduce food waste at household level'],
  ['community','AU','improve access to community mental health services'],
  ['research','US','evaluate interventions to reduce repeat offending'],
  ['research','CA','study interventions to improve medication adherence'],
  ['research','UK','study interventions to reduce care-home falls'],
  ['research','AU','study interventions to improve drought resilience'],
  ['research','US','evaluate interventions to improve public library access'],
  ['research','CA','study interventions to reduce utility disconnections'],
  ['research','UK','study interventions to improve employment after incarceration'],
  ['research','AU','evaluate interventions to reduce road deaths in rural areas'],
  ['enterprise','US','reduce identity-access management failures'],
  ['enterprise','CA','reduce contract approval cycle time'],
  ['enterprise','UK','improve knowledge transfer between teams'],
  ['enterprise','AU','reduce service desk resolution time'],
  ['enterprise','US','improve disaster recovery readiness'],
  ['enterprise','CA','reduce cloud infrastructure costs'],
  ['enterprise','UK','reduce employee phishing susceptibility'],
  ['enterprise','AU','improve records retention compliance'],
];

const CASE_LIMIT = Number.parseInt(process.env.VIDIK_CASE_LIMIT || '', 10);
const ACTIVE_CASES = CASES.filter(([workspace, jurisdiction, problem]) =>
  workspace === 'community' && jurisdiction === 'CA' && problem === 'improve food access'
);

const DOMAIN_TERMS = {
  safety: ['crime','violence','injur','overdose','safety','firearm','emergency'],
  housing: ['homeless','housing','eviction','shelter','rough sleeping'],
  health: ['health','hospital','clinic','overdose','mental','heat','illness'],
  food: ['food','hunger','nutrition'],
  climate: ['heat','wildfire','smoke','flood','climate','bushfire','disaster'],
  mobility: ['transit','traffic','pedestrian','mobility','delivery','congestion'],
  economic: ['business','cost','supply','procurement','economic','churn'],
  employment: ['employee','worker','workforce','hiring','training','burnout','automation'],
  accessibility: ['access','accessible','disabilit','newcomer','digital'],
  infrastructure: ['infrastructure','maintenance','delivery','cycle','backlog'],
  governance: ['regulatory','compliance','governance','data'],
};

function termsFor(problem) {
  const p = problem.toLowerCase();
  return Object.entries(DOMAIN_TERMS).filter(([, terms]) => terms.some(t => p.includes(t))).map(([d]) => d);
}

function candidateRelevant(problem, candidate, workspace) {
  return interventionMatchesProblem(problem, candidate, workspace);
}

test('unified discovery planner preserves historical recall, family, class, taxonomy, and mechanism lanes within one source budget', () => {
  const discoveryModule = require('../js/source-driven-intervention-discovery');
  const plan = discoveryModule.buildDiscoveryQueryPlan('reduce violent crime', 'municipal');
  assert.equal(plan.length, 12);
  assert.ok(plan.some(item => item.query === 'reduce violent crime' && item.queryLayer === 'original'));
  assert.ok(plan.some(item => /focused deterrence|community violence intervention|violence interruption/i.test(item.query) && item.queryLayer === 'recall'));
  assert.ok(plan.some(item => item.queryLayer === 'family-expansion'));
  assert.ok(plan.some(item => item.queryLayer === 'legacy-class-expansion'));
  assert.ok(plan.some(item => item.queryLayer === 'workspace-taxonomy'));
  assert.ok(plan.some(item => item.queryLayer === 'mechanism/admin'));
  assert.equal(new Set(plan.map(item => item.query)).size, plan.length);
  assert.ok(plan.every(item => item.queryLayer && item.query));
});

test('unified planner does not let a large recall pack starve missing-class retrieval', () => {
  const discoveryModule = require('../js/source-driven-intervention-discovery');
  for (const [workspace, problem] of [
    ['municipal', 'reduce violent crime'],
    ['business', 'improve small business survival'],
    ['enterprise', 'reduce procurement cycle time'],
    ['research', 'study interventions to reduce pedestrian injuries']
  ]) {
    const plan = discoveryModule.buildDiscoveryQueryPlan(problem, workspace);
    assert.ok(plan.some(item => item.queryLayer === 'legacy-class-expansion'), workspace + ': missing class lane was starved');
    assert.ok(plan.some(item => item.queryLayer === 'family-expansion'), workspace + ': family lane was starved');
    assert.ok(plan.some(item => item.queryLayer === 'workspace-taxonomy'), workspace + ': taxonomy lane was starved');
  }
});

test('targeted recall packs cover the observed blocked-case discovery lanes without changing taxonomy synthesis', () => {
  const cases = [
    ['municipal','reduce violent crime', /focused deterrence|community violence intervention|violence interruption/i],
    ['municipal','reduce wildfire smoke exposure', /wildfire smoke mitigation|smoke filtration|clean air shelter/i],
    ['business','improve small business survival', /small business grant|working capital support|business continuity support/i],
    ['business','reduce employee turnover', /retention program|manager training|flexible scheduling/i],
    ['business','reduce workplace injuries', /safety training|engineering control|ergonomic assessment/i],
    ['community','reduce heat exposure', /cooling centre|clean air shelter|home cooling/i],
    ['community','reduce wildfire evacuation barriers', /wildfire evacuation support|evacuation assistance|safe passage/i],
    ['research','evaluate interventions for food insecurity', /food voucher|community food hub|school meal program/i],
    ['research','study wildfire smoke mitigation', /wildfire smoke mitigation|smoke filtration|clean air shelter/i],
    ['enterprise','reduce procurement cycle time', /procurement process redesign|procurement workflow automation|e-procurement/i],
    ['enterprise','improve data governance', /data governance program|master data management|data stewardship program/i]
  ];
  for (const [workspace, problem, expected] of cases) {
    const queries = buildDiscoveryQueries(problem, workspace);
    assert.ok(queries.length <= 18, 'query budget exceeded for ' + problem);
    assert.ok(queries.some(query => expected.test(query)), 'recall lane missing for ' + problem);
  }
});

test('discovery recall preserves budget for later layers and covers the newly blocked operational lanes', () => {
  const cases = [
    ['business','reduce supply chain disruption', /supply chain visibility|demand forecasting|inventory buffer|supplier diversification/i],
    ['research','study effective heat-health interventions', /cooling centre|clean air shelter|heat-health intervention/i],
    ['enterprise','reduce employee burnout', /workload management|manager training|employee assistance program|job redesign/i],
    ['enterprise','improve emergency response coordination', /incident command|emergency operations centre|mutual aid coordination|incident management/i]
  ];