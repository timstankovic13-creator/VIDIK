'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { discoverSourceDrivenInterventions, taxonomyTerms, isActionableInterventionTitle, expectedInterventionFamilies, discoveryCoverage, buildDiscoveryQueries } = require('../js/source-driven-intervention-discovery');
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
  ['enterprise','CA','reduce accessibility barriers in digital services'],
];

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

function candidateRelevant(problem, candidate) {
  const text = String(candidate?.name || '') + ' ' + String(candidate?.discoveryText || '');
  const p = problem.toLowerCase();
  const wanted = termsFor(problem);
  return wanted.length === 0 || wanted.some(domain => DOMAIN_TERMS[domain].some(term => text.toLowerCase().includes(term)));
}

test('VIDIK discovery quality contracts: records are not interventions and weak searches expose missing option classes', () => {
  assert.equal(isActionableInterventionTitle('Crime Statistics Dataset','Annual crime counts by neighbourhood'), false);
  assert.equal(isActionableInterventionTitle('Rottnest Island Temperature Observations','Hourly temperature measurements'), false);
  assert.equal(isActionableInterventionTitle('Canada Structures','Infrastructure service program metadata'), false);
  assert.equal(isActionableInterventionTitle('Community Violence Intervention Program','A service delivering violence interruption and outreach'), true);
  assert.equal(isActionableInterventionTitle('Preventive Maintenance Service','Asset maintenance service'), true);
  assert.equal(isActionableInterventionTitle('Public Wi-Fi Access Program','Free public wireless access in community facilities'), true);
  assert.equal(isActionableInterventionTitle('Device Lending Service','Lending computers and tablets to residents'), true);
  assert.equal(isActionableInterventionTitle('The National Service Provider List (NSPL)','Directory of service providers'), false);
  assert.equal(isActionableInterventionTitle('Next Generation Of Jobs Fund grant recipients','List of organizations receiving grants'), false);
  assert.equal(isActionableInterventionTitle('Crime Data Registry','Administrative records'), false);
  assert.equal(isActionableInterventionTitle('Customer Satisfaction Feedback Initiative – Service Questionnaire Results','Questionnaire results'), false);
  assert.equal(isActionableInterventionTitle('Housing Program Evaluation Findings','Evaluation findings'), false);
  assert.ok(require('../js/source-driven-intervention-discovery').inferInterventionFamily('Partner Assault Response Program').includes('public-safety'));
  assert.ok(expectedInterventionFamilies('reduce digital access gaps','municipal').includes('digital-access'));
  assert.ok(taxonomyTerms('reduce residential energy burden','municipal').some(term => /energy|utility|weatherization/i.test(term)));
  assert.ok(buildDiscoveryQueries('reduce violent crime','municipal').some(query => /violence interruption|focused deterrence|hot spot policing/i.test(query)));
  assert.ok(buildDiscoveryQueries('reduce customer churn','business').some(query => /customer retention|loyalty|pricing intervention/i.test(query)));
  assert.ok(buildDiscoveryQueries('reduce cybersecurity incident risk','enterprise').some(query => /zero trust|multi factor authentication|endpoint detection/i.test(query)));
  assert.ok(buildDiscoveryQueries('reduce digital access gaps','community').some(query => /device lending|broadband voucher|digital inclusion/i.test(query)));
  // Weak source libraries must trigger bounded, family-specific literature expansion rather than
  // a single broad query; the fanout remains governed and discovery-only.
  const discoveryModule = require('../js/source-driven-intervention-discovery');
  assert.ok(discoveryModule.buildDiscoveryQueries('reduce violent crime','municipal').length <= 18);
  assert.match(queryFor({ name: 'Partner Assault Response Program', interventionFamily: ['public-safety'] }, 'reduce violent crime'), /violence interruption|focused deterrence|hot spot policing|community violence intervention/);
  assert.equal(evidenceLeadRelevance('Housing First randomized trial for homeless adults', { name: 'Housing First', interventionFamily: ['housing'] }, 'reduce homelessness'), 'candidate-match');
  assert.equal(evidenceLeadRelevance('Rental assistance evaluation for homeless adults', { name: 'Permanent Housing Access Program', discoveryText: 'rental assistance and permanent housing placement', interventionFamily: ['housing'] }, 'reduce homelessness'), 'candidate-match');
  assert.equal(evidenceLeadRelevance('Community violence intervention evaluation', { name: 'Partner Assault Response Program', interventionFamily: ['public-safety'] }, 'reduce violent crime'), 'family-match');
  assert.equal(evidenceLeadRelevance('Violent crime trends among residents', { name: 'Partner Assault Response Program', interventionFamily: ['public-safety'] }, 'reduce violent crime'), 'problem-match');
  const pubmedXml = '<PubmedArticle><MedlineCitation><PMID>12345</PMID><Article><ArticleTitle>Intervention trial</ArticleTitle><Abstract><AbstractText>Community violence intervention reduced assault injuries.</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle>';
  assert.equal(extractPubmedAbstracts(pubmedXml)['12345'], 'Community violence intervention reduced assault injuries.');
  assert.equal(evidenceLeadRelevance('Evaluation of community violence intervention', { name: 'Community Violence Intervention Program', interventionFamily: ['public-safety'] }, 'reduce violent crime'), 'candidate-match');
  assert.equal(evidenceLeadRelevance('Violence prevention program evaluation for urban neighborhoods', { name: 'Community Violence Intervention Program', interventionFamily: ['public-safety'] }, 'reduce violent crime'), 'family-match');
  assert.equal(evidenceLeadRelevance('Violence-prevention programmes in urban neighborhoods', { name: 'Community Violence Intervention Program', interventionFamily: ['public-safety'] }, 'reduce violent crime'), 'family-match');
  assert.equal(evidenceLeadRelevance('Housing outcomes after a community intervention', { name: 'Rental Assistance Program', interventionFamily: ['housing'] }, 'reduce homelessness'), 'family-match');

  const municipalSafety=expectedInterventionFamilies('reduce violent crime','municipal');
  const businessChurn=expectedInterventionFamilies('reduce customer churn','business');
  const enterpriseCyber=expectedInterventionFamilies('reduce cybersecurity incident risk','enterprise');
  assert.ok(municipalSafety.includes('public-safety'));
  assert.ok(businessChurn.includes('economic-support'));
  assert.ok(enterpriseCyber.includes('cybersecurity'));
  assert.notDeepEqual(municipalSafety,businessChurn);
  assert.notDeepEqual(businessChurn,enterpriseCyber);

  const coverage=discoveryCoverage('reduce violent crime','municipal',[
    {interventionFamily:['housing']},
    {interventionFamily:['health-service']}
  ]);
  assert.ok(coverage.missingFamilies.length>0,'missing intervention classes must remain visible instead of being treated as complete');
  assert.ok(coverage.coverageRatio<1);
});

test('VIDIK INSIGHT QUALITY BATTERY: 60 genuinely different problems produce inspectable, governed decision intelligence', async () => {
  const results = [];
  for (const [workspace, jurisdiction, problem] of CASES) {
    const discovery = await discoverSourceDrivenInterventions({ problem, jurisdiction, workspace, rows: 5 });
    assert.equal(discovery.problem, problem);
    assert.ok(discovery.discoveryHash, workspace + ': missing discovery hash for ' + problem);
    assert.ok(discovery.sourceSearches.length > 0, workspace + ': no source searches for ' + problem);
    assert.ok(Array.isArray(discovery.interventionUniverse.expectedInterventionFamilies));
    assert.ok(Array.isArray(discovery.interventionUniverse.observedInterventionFamilies));
    assert.ok(Array.isArray(discovery.interventionUniverse.missingInterventionFamilies));
    assert.equal(typeof discovery.interventionUniverse.coverageRatio, 'number');

    const candidates = discovery.candidates || [];
    const relevant = candidates.filter(candidate => candidateRelevant(problem, candidate));
    const actionable = candidates.filter(candidate => isActionableInterventionTitle(candidate.name, candidate.discoveryText));
    const expectedTerms = taxonomyTerms(problem, workspace).map(term => term.toLowerCase());
    const expectedClassHits = candidates.filter(candidate => expectedTerms.some(term => String(candidate.name + ' ' + candidate.discoveryText).toLowerCase().includes(term))).length;
    const families = new Set(candidates.flatMap(candidate => candidate.interventionFamily || []));
    const expectedFamilies = expectedInterventionFamilies(problem, workspace);
    const expectedFamilyHits = expectedFamilies.filter(family => families.has(family));

    // Discovery must remain discovery: no causal effects or recommendation can leak in here.
    assert.ok(candidates.every(candidate => candidate.discovery?.leadOnly === true));
    assert.ok(candidates.every(candidate => candidate.discovery?.effectsImported === false));
    assert.equal(discovery.interventionUniverse.recommendationEligible, false);

    let evidence = null;
    if (candidates[0]) {
      evidence = await discoverCandidateUniverseEvidence({ problem, candidates, rows: 3, maxCandidates: 2 });
      assert.equal(evidence.recommendationEligible, false);
      assert.equal(evidence.effectsImported, false);
      assert.ok(evidence.candidateEvidence.every(result => result.sourceSearches.length >= 2));
      assert.ok(evidence.candidateEvidence.every(result => result.evidenceLeads.every(lead => lead.evidenceLeadOnly === true)));
      assert.ok(evidence.candidateEvidence.every(result => result.evidenceLeads.every(lead => lead.causalEffectImported === false)));
    }

    const relevanceRatio = candidates.length ? relevant.length / candidates.length : 0;
    const evidenceResults = evidence?.candidateEvidence || [];
    const evidenceCompleteCandidate = evidenceResults.find(result => result.evidenceSufficiency?.independentSourceCount >= 2);
    const independentEvidenceSources = evidenceCompleteCandidate ? evidenceCompleteCandidate.evidenceSufficiency.independentSourceCount : 0;
    const evidenceLeads = evidenceResults.reduce((count, result) => count + (result.evidenceLeads?.length || 0), 0);

    let grade = 'BLOCKED';
    if (candidates.length > 0 && actionable.length === candidates.length && relevanceRatio >= 0.5 && expectedClassHits > 0 && independentEvidenceSources >= 2 && evidenceLeads > 0 && families.size >= 2) {
      grade = 'STRONG';
    } else if (candidates.length > 0 && relevant.length > 0) {
      grade = 'USEFUL-INCOMPLETE';
    }

    results.push({
      workspace, jurisdiction, problem,
      candidateCount: candidates.length,
      actionableCount: actionable.length,
      expectedClassHits,
      expectedFamilyHits: expectedFamilyHits.length,
      expectedFamilyCoverage: expectedFamilies.length ? Number((expectedFamilyHits.length / expectedFamilies.length).toFixed(2)) : 1,
      relevantCount: relevant.length,
      relevanceRatio: Number(relevanceRatio.toFixed(2)),
      interventionFamilies: [...families],
      topCandidates: candidates.slice(0, 5).map(c => c.name),
      evidenceLeads,
      independentEvidenceSources,
      evidenceComplete: evidence?.evidenceComplete ?? false,
      grade,
      discoveryState: discovery.interventionUniverse.stoppingReason
    });
  }

  const counts = Object.fromEntries(['STRONG','USEFUL-INCOMPLETE','BLOCKED'].map(g => [g, results.filter(r => r.grade === g).length]));
  const totalCandidates = results.reduce((n, r) => n + r.candidateCount, 0);
  const avgCandidates = totalCandidates / results.length;
  const evidenceBackedCases = results.filter(r => r.independentEvidenceSources >= 2 && r.evidenceLeads > 0).length;

  assert.equal(results.length, CASES.length);
  assert.ok(results.every(r => r.grade !== undefined));
  // Quality grades are findings, not pass/fail assertions. A zero-STRONG result is intentionally reportable evidence that the insight layer needs work.
  console.log(JSON.stringify({
    battery: 'VIDIK Insight Quality Battery v1',
    cases: results.length,
    gradeCounts: counts,
    averageCandidatesPerProblem: Number(avgCandidates.toFixed(2)),
    averageActionableRatio: Number((results.reduce((n,r) => n + (r.candidateCount ? r.actionableCount/r.candidateCount : 0),0)/results.length).toFixed(2)),
    casesWithExpectedInterventionClassHit: results.filter(r => r.expectedClassHits > 0).length,
    casesWithExpectedFamilyCoverage: results.filter(r => r.expectedFamilyHits > 0).length,
    averageExpectedFamilyCoverage: Number((results.reduce((n,r) => n + r.expectedFamilyCoverage, 0) / results.length).toFixed(2)),
    casesWithTwoIndependentEvidenceSources: evidenceBackedCases,
    casesWithNoCandidates: counts.BLOCKED,
    note: 'Grades are automated triage, not expert semantic judgments. STRONG means the returned universe is relevant by domain-term checks, diversified, and has independent evidence leads; USEFUL-INCOMPLETE means an inspectable universe exists but one or more quality dimensions remain weak; BLOCKED means no relevant candidate universe was produced.'
  }, null, 2));
  console.log(JSON.stringify(results, null, 2));
});


// Literature discovery may legitimately surface a taxonomy intervention term through an exact
// source query even when the paper title uses different wording. The lead must remain auditable
// and discovery-only; this guards against the UK digital-access live failure without weakening
// the candidate/effect authority boundary.
test('literature query-backed intervention leads retain auditable source provenance', async () => {
  const { extractOpenAlexInterventionLeads } = require('../js/source-driven-intervention-discovery');
  const source = { sourceId: 'openalex-works', jurisdiction: 'international', domain: 'causal-evidence' };
  const leads = extractOpenAlexInterventionLeads({ results: [{ id: 'https://openalex.org/W1', display_name: 'Digital divide policy evaluation' }] }, source, 'reduce digital access gaps', 'research', 'reduce digital access gaps broadband subsidy');
  assert.ok(leads.length > 0);
  assert.equal(leads[0].name, 'broadband subsidy');
  const unrelated = extractOpenAlexInterventionLeads(
    { results: [{ id: 'https://openalex.org/W2', display_name: 'Quantum materials characterization methods' }] },
    source,
    'reduce digital access gaps',
    'research',
    'reduce digital access gaps broadband subsidy'
  );
  assert.equal(unrelated.length, 0, 'unrelated literature must not manufacture an intervention lead');
  const municipalLiterature = extractOpenAlexInterventionLeads({ results: [{ id: 'https://openalex.org/W3', display_name: 'Digital divide policy evaluation' }] }, source, 'reduce digital access gaps', 'municipal', 'reduce digital access gaps broadband subsidy');
  assert.equal(municipalLiterature[0]?.name, 'broadband subsidy');
  assert.notEqual(municipalLiterature[0]?.name, 'Digital divide policy evaluation', 'paper titles must never become intervention candidate names');
  assert.equal(leads[0].discovery.leadOnly, true);
  assert.equal(leads[0].discovery.effectsImported, false);
  assert.equal(leads[0].discovery.provenance[0].discoveryQuery, 'reduce digital access gaps broadband subsidy');
  assert.equal(leads[0].discovery.provenance[0].relevanceStatus, 'query-match');
});

// Insight-quality battery remains intentionally diagnostic: weak semantic results are findings, not masked pass conditions.

// rerun after discovery syntax correction

// trigger after extraction syntax fix


test('evidence search ladder retains both independent providers and bounded per-source expansion', async () => {
  const { discoverCandidateEvidence } = require('../js/source-driven-evidence-discovery');
  const candidate = {
    id: 'candidate:test-violence',
    name: 'Focused Deterrence',
    discoveryText: 'focused deterrence group violence intervention',
    interventionFamily: ['public-safety']
  };
  const result = await discoverCandidateEvidence({
    problem: 'reduce violent crime',
    candidate,
    fetchImpl: async url => ({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      arrayBuffer: async () => Buffer.from(url.includes('eutils.ncbi.nlm.nih.gov')
        ? JSON.stringify({ esearchresult: { idlist: ['1'] } })
        : JSON.stringify({ results: [{ id: 'W1', display_name: 'Focused Deterrence Group Violence Intervention' }] }))
    })
  });
  assert.ok(result.sourceDiagnostics['openalex-works']);
  assert.ok(result.sourceDiagnostics['pubmed-eutils']);
  assert.ok(result.diversifiedQueries.length <= 10);
  assert.ok(result.sourceSearches.some(s => s.sourceId === 'openalex-works'));
  assert.ok(result.sourceSearches.some(s => s.sourceId === 'pubmed-eutils'));
});
