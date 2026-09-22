'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { discoverCandidateEvidence } = require('../js/source-driven-evidence-discovery');
const mod = require('../js/source-driven-intervention-discovery');

const CASES = [
  ['municipal','CA','reduce violent crime'],['municipal','CA','reduce pedestrian injuries'],
  ['municipal','CA','reduce emergency department overcrowding'],['municipal','CA','reduce homelessness'],
  ['municipal','CA','reduce food insecurity'],['municipal','CA','reduce extreme heat illness'],
  ['municipal','CA','reduce wildfire smoke exposure'],['municipal','CA','reduce traffic congestion'],
  ['municipal','CA','reduce construction permitting delays'],['municipal','CA','reduce residential energy burden'],
  ['municipal','CA','reduce opioid overdose deaths'],['municipal','CA','improve access to affordable childcare'],
  ['municipal','US','reduce gun violence'],['municipal','US','reduce school absenteeism'],
  ['municipal','US','reduce flood damage'],['municipal','US','improve transit reliability'],
  ['municipal','US','reduce eviction filings'],['municipal','UK','reduce rough sleeping'],
  ['municipal','UK','reduce air pollution'],['municipal','AU','reduce bushfire smoke exposure'],
  ['business','US','improve small business survival'],['business','US','reduce customer churn'],
  ['business','US','reduce employee turnover'],['business','US','reduce workplace injuries'],
  ['business','CA','reduce supply chain disruption'],['business','CA','reduce energy costs'],
  ['business','UK','improve hiring success'],['business','AU','reduce delivery delays'],
  ['business','US','increase employee training completion'],['business','CA','improve accessibility for customers with disabilities'],
  ['community','CA','improve food access'],['community','CA','reduce social isolation among seniors'],
  ['community','CA','improve newcomer employment'],['community','CA','increase access to affordable housing'],
  ['community','US','reduce youth violence'],['community','US','improve disaster preparedness'],
  ['community','US','reduce heat exposure'],['community','UK','improve mental health service access'],
  ['community','AU','reduce wildfire evacuation barriers'],['community','AU','improve rural healthcare access'],
  ['research','UK','evaluate interventions to reduce homelessness'],['research','UK','evaluate ways to reduce hospital waiting times'],
  ['research','UK','evaluate interventions for food insecurity'],['research','UK','study effective heat-health interventions'],
  ['research','US','study interventions to reduce pedestrian injuries'],['research','US','study workforce displacement from automation'],
  ['research','CA','study interventions for opioid overdose prevention'],['research','CA','study energy poverty interventions'],
  ['research','AU','study wildfire smoke mitigation'],['research','AU','study interventions to improve rural mobility'],
  ['enterprise','US','reduce digital access gaps'],['enterprise','US','reduce cybersecurity incident risk'],
  ['enterprise','US','reduce procurement cycle time'],['enterprise','CA','reduce employee burnout'],
  ['enterprise','CA','improve remote service delivery'],['enterprise','UK','reduce regulatory compliance delays'],
  ['enterprise','UK','improve data governance'],['enterprise','AU','reduce infrastructure maintenance backlog'],
  ['enterprise','AU','improve emergency response coordination'],['enterprise','CA','reduce accessibility barriers in digital services'],
];

test('fast insight-quality preflight: the complete 60-case surface stays bounded and deterministic', () => {
  assert.equal(CASES.length, 60);
  for (const [workspace, jurisdiction, problem] of CASES) {
    const first = mod.buildDiscoveryQueries(problem, workspace);
    const second = mod.buildDiscoveryQueries(problem, workspace);
    assert.ok(first.length > 0, workspace + ':' + jurisdiction + ':' + problem);
    assert.ok(first.length <= mod.DISCOVERY_MAX_QUERIES_PER_SOURCE, 'query budget exceeded: ' + problem);
    assert.deepEqual(first, second, 'nondeterministic query generation: ' + problem);
    assert.equal(first[0], problem, 'original problem must remain first: ' + problem);
    assert.ok(!first.some(q => /\\b(dataset|dashboard|census|statistics|report)\\b/i.test(q)),
      'administrative/data artifact leaked into query generation: ' + problem);
  }
});

test('fast insight-quality preflight: all targeted blocked-case recall anchors reach the live query slice', () => {
  const lanes = [
    ['municipal','reduce violent crime',/focused deterrence|community violence intervention|violence interruption/i],
    ['municipal','reduce wildfire smoke exposure',/wildfire smoke mitigation|smoke filtration|clean air shelter/i],
    ['business','improve small business survival',/small business grant|working capital support|business continuity support/i],
    ['business','reduce employee turnover',/retention program|manager training|flexible scheduling/i],
    ['business','reduce workplace injuries',/safety training|engineering control|ergonomic assessment/i],
    ['community','reduce heat exposure',/cooling centre|clean air shelter|home cooling/i],
    ['community','reduce wildfire evacuation barriers',/wildfire evacuation support|evacuation assistance|safe passage/i],
    ['research','evaluate interventions for food insecurity',/food voucher|community food hub|school meal program/i],
    ['research','study wildfire smoke mitigation',/wildfire smoke mitigation|smoke filtration|clean air shelter/i],
    ['enterprise','reduce procurement cycle time',/procurement process redesign|procurement workflow automation|e-procurement/i],
    ['enterprise','improve data governance',/data governance program|master data management|data stewardship program/i],
    ['enterprise','reduce cybersecurity incident risk',/zero trust|multi factor authentication|endpoint detection/i],
  ];
  for (const [workspace, problem, pattern] of lanes) {
    const queries = mod.buildDiscoveryQueries(problem, workspace);
    assert.ok(queries.slice(0, 12).some(q => pattern.test(q)), 'recall anchor crowded out: ' + problem);
  }
});

test('fast insight-quality preflight: expanded 240-case query battery runs without external sources', () => {
  const expanded = CASES.flatMap(([workspace, jurisdiction, problem]) => [
    [workspace, jurisdiction, problem],
    [workspace, jurisdiction, 'help to ' + problem],
    [workspace, jurisdiction, problem.replace(/^reduce /i, 'lower ')],
    [workspace, jurisdiction, problem.replace(/^improve /i, 'increase ')],
  ]);
  assert.equal(expanded.length, 240);
  let executed = 0;
  for (const [workspace, jurisdiction, problem] of expanded) {
    const queries = mod.buildDiscoveryQueries(problem, workspace);
    executed += queries.length;
    assert.ok(queries.length <= 18, 'expanded query budget exceeded: ' + workspace + ':' + jurisdiction + ':' + problem);
    assert.ok(queries.length > 0);
  }
  assert.ok(executed >= 240);
});

test('fast insight-quality preflight: actionable intervention corpus survives while adversarial artifacts fail', () => {
  const actionable = [
    ['reduce violent crime','municipal','Community Violence Intervention Program'],
    ['reduce wildfire smoke exposure','municipal','Wildfire Smoke Mitigation Program'],
    ['improve small business survival','business','Small Business Grant Program'],
    ['reduce employee turnover','business','Employee Retention Program'],
    ['reduce workplace injuries','business','Workplace Safety Training Program'],
    ['reduce heat exposure','community','Cooling Centre Program'],
    ['reduce wildfire evacuation barriers','community','Wildfire Evacuation Support'],
    ['food insecurity','research','Community Food Hub Program'],
    ['study wildfire smoke mitigation','research','Smoke Filtration Intervention'],
    ['reduce cybersecurity incident risk','enterprise','Multi Factor Authentication Program'],
    ['reduce procurement cycle time','enterprise','Procurement Workflow Automation'],
    ['improve data governance','enterprise','Data Governance Program'],
    ['reduce urban flooding','municipal','Stormwater Infrastructure Project'],
  ];
  for (const [problem, workspace, candidate] of actionable) {
    assert.equal(mod.interventionMatchesProblem(problem,{name:candidate,discoveryText:candidate},workspace),true,
      'valid intervention rejected: ' + candidate);
  }

  const artifacts = [
    'Crime Statistics Dataset','Crime Data Dashboard','Annual Crime Report','Population Census',
    'Service Delivery Performance Report','Program Evaluation Findings','Administrative Records',
    'Funding Allocations','Grant Recipients List','Provider Directory',
    'National Assessment of Preparedness','Survey Estimates of Barriers','Infrastructure Metadata',
    'Climate Statistics','Hospital Waiting Times Dashboard','Employee Turnover Statistics',
    'Cybersecurity Risk Assessment Report','Procurement Cycle Time Dashboard',
    'Data Governance Annual Report','Air Pollution Monitoring Data','Wildfire Smoke Exposure Measurements'
  ];
  for (const title of artifacts) {
    assert.equal(mod.isActionableInterventionTitle(title,title),false,'artifact accepted: ' + title);
  }
});

test('fast insight-quality preflight: workspace boundaries reject obvious cross-domain decoys', () => {
  assert.equal(mod.interventionMatchesProblem(
    'improve data governance',{name:'Permit Modernization',discoveryText:'permit compliance service'},'enterprise'),false);
  assert.equal(mod.interventionMatchesProblem(
    'improve emergency response coordination',{name:'Preventive Maintenance',discoveryText:'asset maintenance service'},'enterprise'),false);
  assert.equal(mod.interventionMatchesProblem(
    'reduce regulatory compliance delays',{name:'Permit Modernization',discoveryText:'permit modernization service'},'enterprise'),true);
  assert.equal(mod.interventionMatchesProblem(
    'reduce violent crime',{name:'Community Violence Intervention Program',discoveryText:'violence interruption outreach'},'municipal'),true);
});

test('fast insight-quality evidence gate: bounded ladder preserves independent providers', async () => {
  const candidate = { id: 'candidate:fast-gate-violence', name: 'Focused Deterrence', discoveryText: 'focused deterrence group violence intervention', interventionFamily: ['public-safety'] };
  const result = await discoverCandidateEvidence({
    problem: 'reduce violent crime', candidate,
    fetchImpl: async url => ({
      ok: true, status: 200, headers: { get: () => 'application/json' },
      arrayBuffer: async () => Buffer.from(url.includes('eutils.ncbi.nlm.nih.gov')
        ? JSON.stringify({ esearchresult: { idlist: ['1'] } })
        : JSON.stringify({ results: [{ id: 'W1', display_name: 'Focused Deterrence Group Violence Intervention' }] }))
    })
  });
  assert.ok(result.diversifiedQueries.length <= 10);
  assert.ok(result.sourceSearches.some(s => s.sourceId === 'openalex-works'));
  assert.ok(result.sourceSearches.some(s => s.sourceId === 'pubmed-eutils'));
  assert.ok(result.sourceDiagnostics['openalex-works']);
  assert.ok(result.sourceDiagnostics['pubmed-eutils']);
});
