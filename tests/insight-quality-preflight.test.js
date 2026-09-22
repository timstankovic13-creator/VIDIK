'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const mod = require('../js/source-driven-intervention-discovery');

const CASES = [
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
  ['enterprise','US','reduce digital access gaps'],
  ['enterprise','US','reduce cybersecurity incident risk'],
  ['enterprise','US','reduce procurement cycle time'],
  ['enterprise','CA','reduce employee burnout'],
  ['enterprise','CA','improve remote service delivery'],
  ['enterprise','UK','reduce regulatory compliance delays'],
  ['enterprise','UK','improve data governance'],
  ['enterprise','AU','reduce infrastructure maintenance backlog'],
  ['enterprise','AU','improve emergency response coordination'],
  ['enterprise','CA','reduce accessibility barriers in digital services'],
];

const POSITIVE_CANDIDATES = [
  ['reduce violent crime','municipal','Community Violence Intervention Program'],
  ['reduce violent crime','municipal','Focused Deterrence Program'],
  ['reduce wildfire smoke exposure','municipal','Wildfire Smoke Mitigation Program'],
  ['reduce wildfire smoke exposure','municipal','Clean Air Shelter Program'],
  ['improve small business survival','business','Small Business Grant Program'],
  ['reduce employee turnover','business','Employee Retention Program'],
  ['reduce workplace injuries','business','Workplace Safety Training Program'],
  ['reduce heat exposure','community','Cooling Centre Program'],
  ['reduce wildfire evacuation barriers','community','Wildfire Evacuation Support'],
  ['food insecurity','research','Community Food Hub Program'],
  ['study wildfire smoke mitigation','research','Smoke Filtration Intervention'],
  ['reduce cybersecurity incident risk','enterprise','Multi Factor Authentication Program'],
  ['reduce procurement cycle time','enterprise','Procurement Workflow Automation'],
  ['improve data governance','enterprise','Data Stewardship Program'],
  ['reduce traffic fatalities','municipal','Road Safety Infrastructure Project'],
  ['reduce urban flooding','municipal','Stormwater Infrastructure Project'],
];

const NEGATIVE_CANDIDATES = [
  ['reduce violent crime','municipal','Annual Crime Statistics Dataset'],
  ['reduce wildfire smoke exposure','municipal','Wildfire Smoke Exposure Statistics'],
  ['improve small business survival','business','Small Business Survival Report'],
  ['reduce employee turnover','business','Employee Turnover Dashboard'],
  ['reduce workplace injuries','business','Workplace Injury Census'],
  ['reduce heat exposure','community','Annual Heat Exposure Statistics'],
  ['reduce cybersecurity incident risk','enterprise','Cybersecurity Risk Report'],
  ['reduce procurement cycle time','enterprise','Procurement Cycle Time Dashboard'],
  ['improve data governance','enterprise','Data Governance Assessment Report'],
  ['improve emergency response coordination','enterprise','Climate Change Fund Evaluation'],
  ['reduce regulatory compliance delays','enterprise','Annual Regulatory Compliance Statistics'],
  ['reduce urban flooding','municipal','National Population Census'],
];

test('fast preflight: every production battery problem generates bounded, deterministic discovery queries', () => {
  assert.equal(CASES.length, 60);
  for (const [workspace, jurisdiction, problem] of CASES) {
    const first = mod.buildDiscoveryQueries(problem, workspace);
    const second = mod.buildDiscoveryQueries(problem, workspace);

    assert.ok(first.length >= 1, workspace + ':' + jurisdiction + ':' + problem);
    assert.ok(first.length <= mod.DISCOVERY_MAX_QUERIES_PER_SOURCE, 'query budget exceeded: ' + problem);
    assert.deepEqual(first, second, 'query generation is nondeterministic: ' + problem);
    assert.equal(first[0], problem, 'original problem must remain the first query: ' + problem);
    assert.ok(!first.some(q => /\\b(dataset|dashboard|census|statistics|report)\\b/i.test(q)),
      'discovery query leaked an administrative/data artifact term: ' + problem);
  }
});

test('fast preflight: targeted recall anchors survive the live query slice for every blocked-case lane', () => {
  const expected = [
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
    ['enterprise','improve data governance', /data governance program|master data management|data stewardship program/i],
    ['enterprise','reduce cybersecurity incident risk', /zero trust|multi factor authentication|endpoint detection/i],
  ];

  for (const [workspace, problem, pattern] of expected) {
    const queries = mod.buildDiscoveryQueries(problem, workspace);
    assert.ok(queries.slice(0, 12).some(q => pattern.test(q)),
      'recall anchor was crowded out: ' + workspace + ':' + problem);
  }
});

test('fast preflight: workspace-specific query generation stays separated across all 60 cases', () => {
  const workspaceAnchors = {
    business: /customer|employee|workplace|procurement|small business|supply chain|hiring|training|accessibility/i,
    community: /community|housing|food|violence|disaster|heat|wildfire|health|rural|isolation/i,
    research: /intervention|evaluate|study|research|food|wildfire|pedestrian|workforce|energy|mobility|health/i,
    enterprise: /enterprise|digital|cyber|procurement|employee|remote|regulatory|data|infrastructure|emergency|accessibility/i,
    municipal: /municipal|crime|pedestrian|emergency|homeless|food|heat|wildfire|traffic|housing|energy|opioid|childcare|gun|school|flood|transit|eviction|rough|air|bushfire/i,
  };

  for (const [workspace, jurisdiction, problem] of CASES) {
    const queries = mod.buildDiscoveryQueries(problem, workspace);
    assert.ok(queries.some(q => workspaceAnchors[workspace].test(q)),
      'no workspace-relevant terminology survived: ' + workspace + ':' + jurisdiction + ':' + problem);
  }
});

test('fast preflight: known actionable candidates pass relevance while administrative decoys fail', () => {
  for (const [problem, workspace, candidate] of POSITIVE_CANDIDATES) {
    assert.equal(
      mod.interventionMatchesProblem(problem, { name: candidate, discoveryText: candidate }, workspace),
      true,
      'valid intervention rejected: ' + workspace + ':' + problem + ':' + candidate
    );
  }

  for (const [problem, workspace, candidate] of NEGATIVE_CANDIDATES) {
    assert.equal(
      mod.interventionMatchesProblem(problem, { name: candidate, discoveryText: candidate }, workspace),
      false,
      'decoy survived relevance gate: ' + workspace + ':' + problem + ':' + candidate
    );
  }
});

test('fast preflight: actionability gate rejects a broad adversarial artifact corpus', () => {
  const artifacts = [
    'Crime Statistics Dataset',
    'Crime Data Dashboard',
    'Annual Crime Report',
    'Population Census',
    'Service Delivery Performance Report',
    'Program Evaluation Findings',
    'Administrative Records',
    'Funding Allocations',
    'Grant Recipients List',
    'Provider Directory',
    'National Assessment of Preparedness',
    'Survey Estimates of Barriers',
    'Customer Satisfaction Questionnaire Results',
    'Regulatory Casework Review',
    'Infrastructure Metadata',
    'Climate Statistics',
    'Hospital Waiting Times Dashboard',
    'Employee Turnover Statistics',
    'Cybersecurity Risk Assessment Report',
    'Procurement Cycle Time Dashboard',
    'Data Governance Annual Report',
    'Air Pollution Monitoring Data',
    'Wildfire Smoke Exposure Measurements',
    'Emergency Response Performance Statistics',
  ];

  for (const title of artifacts) {
    assert.equal(mod.isActionableInterventionTitle(title, title), false, 'artifact accepted: ' + title);
  }
});

test('fast preflight: legitimate intervention forms remain actionable across domains', () => {
  const interventions = [
    'Community Violence Intervention Program',
    'Focused Deterrence Program',
    'Wildfire Smoke Mitigation Program',
    'Clean Air Shelter Program',
    'Small Business Grant Program',
    'Employee Retention Program',
    'Workplace Safety Training Program',
    'Cooling Centre Program',
    'Wildfire Evacuation Support',
    'Community Food Hub Program',
    'Food Voucher Program',
    'Smoke Filtration Intervention',
    'Multi Factor Authentication Program',
    'Procurement Workflow Automation',
    'Data Stewardship Program',
    'Road Safety Infrastructure Project',
    'Stormwater Infrastructure Project',
    'Preventive Maintenance Program',
    'Public Wi-Fi Access Program',
    'Device Lending Service',
    'Accessible Service Design Program',
    'Manager Training Program',
    'Flexible Scheduling Program',
    'Business Continuity Support Program',
  ];

  for (const title of interventions) {
    assert.equal(mod.isActionableInterventionTitle(title, title), true, 'intervention rejected: ' + title);
  }
});

test('fast preflight: query-budget pressure cannot erase the original problem or targeted anchors', () => {
  const stressed = [
    ['municipal','reduce violent crime'],
    ['municipal','reduce wildfire smoke exposure'],
    ['business','reduce employee turnover'],
    ['community','reduce wildfire evacuation barriers'],
    ['research','study wildfire smoke mitigation'],
    ['enterprise','reduce cybersecurity incident risk'],
    ['enterprise','improve data governance'],
  ];

  for (const [workspace, problem] of stressed) {
    const queries = mod.buildDiscoveryQueries(problem, workspace);
    assert.equal(queries[0], problem);
    assert.ok(queries.length <= 18);
    const recall = mod.discoveryRecallTerms(problem, workspace);
    assert.ok(recall.length > 0);
    assert.ok(recall.every(term => queries.slice(0, 12).includes(term)),
      'not all recall anchors reached the live slice: ' + workspace + ':' + problem);
  }
});

test('fast preflight: discovery recall metadata is immutable and workspace-scoped', () => {
  assert.ok(Object.isFrozen(mod.DISCOVERY_RECALL_PACKS));
  for (const pack of mod.DISCOVERY_RECALL_PACKS) {
    assert.ok(['municipal','business','community','research','enterprise'].includes(pack.workspace));
    assert.ok(Array.isArray(pack.terms) && pack.terms.length >= 3);
    const result = mod.discoveryRecallTerms('completely unrelated problem', pack.workspace);
    assert.equal(result.length, 0);
  }
});

test('fast preflight: expanded test surface is materially larger than the production battery without network calls', () => {
  const syntheticCases = CASES.flatMap(([workspace, jurisdiction, problem]) => [
    [workspace, jurisdiction, problem],
    [workspace, jurisdiction, 'help to ' + problem],
    [workspace, jurisdiction, problem.replace(/^reduce /i, 'lower ')],
    [workspace, jurisdiction, problem.replace(/^improve /i, 'increase ')],
  ]);
  assert.equal(syntheticCases.length, 240);

  let checks = 0;
  for (const [workspace, jurisdiction, problem] of syntheticCases) {
    const queries = mod.buildDiscoveryQueries(problem, workspace);
    checks += queries.length;
    assert.ok(queries.length <= 18, 'synthetic query budget exceeded: ' + workspace + ':' + jurisdiction + ':' + problem);
    assert.ok(queries.length > 0);
  }
  assert.ok(checks >= 240, 'expanded preflight did not execute across all synthetic cases');
});
