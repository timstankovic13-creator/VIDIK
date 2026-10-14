'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  discoverSourceDrivenInterventions,
  taxonomyTerms,
  isActionableInterventionTitle,
  interventionMatchesProblem,
  expectedInterventionFamilies
} = require('../js/source-driven-intervention-discovery');
const { discoverCandidateUniverseEvidence } = require('../js/source-driven-evidence-discovery');

const BASELINE_60 = [
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
  ['enterprise','CA','reduce accessibility barriers in digital services']
];

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function runWorker() {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      const item = items[index];
      const label = Array.isArray(item) ? item.join(' | ') : String(index);
      const startedAt = Date.now();
      let timeoutHandle;
      const controller = new AbortController();
      console.log(JSON.stringify({ event: 'baseline-case-start', case: index + 1, total: items.length, label }));
      try {
        results[index] = await Promise.race([
          worker(item, index, controller.signal),
          new Promise((_, reject) => {
            timeoutHandle = setTimeout(() => {
              const error = new Error('baseline-case-timeout-after-90s: ' + label);
              controller.abort(error);
              reject(error);
            }, 90000);
          })
        ]);
        console.log(JSON.stringify({
          event: 'baseline-case-complete',
          case: index + 1,
          total: items.length,
          label,
          durationMs: Date.now() - startedAt
        }));
      } catch (error) {
        if (!String(error?.message || error).startsWith('baseline-case-timeout-after-90s:')) throw error;
        const [workspace, jurisdiction, ...problemParts] = item;
        results[index] = {
          workspace, jurisdiction, problem: problemParts.join(' | '),
          candidateCount: null, actionableCount: null, relevantCount: null, relevanceRatio: null,
          expectedClassHits: null, expectedFamilyHits: null, expectedFamilyCoverage: null,
          interventionFamilies: [], evidenceLeads: null, independentEvidenceSources: null,
          evidenceComplete: null, productionRelevanceRatio: null, candidateQualityDefects: null,
          topCandidates: [], grade: 'BLOCKED', measurementStatus: 'timed-out',
          baselineError: error.message, sourceFailureCount: null, sourceEmptyCount: null,
          sourceSearchCount: null, queryLayers: [], attemptedQueries: null,
          missingFamilies: [], missingClasses: []
        };
        console.log(JSON.stringify({
          event: 'baseline-case-timeout', case: index + 1, total: items.length,
          label, durationMs: Date.now() - startedAt, error: error.message
        }));
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runWorker()));
  return results;
}

test('VIDIK DISCOVERY QUALITY BASELINE: canonical 60-problem battery after integrated discovery work', async () => {
  const results = await mapWithConcurrency(BASELINE_60, 3, async ([workspace, jurisdiction, problem], index, signal) => {
    const discoveryStartedAt = Date.now();
    console.log(JSON.stringify({ event: 'baseline-discovery-start', case: index + 1, workspace, jurisdiction, problem }));
    const discovery = await discoverSourceDrivenInterventions({ problem, jurisdiction, workspace, rows: 5, maxSources: 2, maxQueriesPerSource: 6, maxLiteratureQueries: 1, skipExpansion: true, signal });
    console.log(JSON.stringify({ event: 'baseline-discovery-complete', case: index + 1, durationMs: Date.now() - discoveryStartedAt, candidateCount: discovery.candidates?.length || 0, sourceCount: discovery.sourceSearches?.length || 0 }));
    assert.equal(discovery.problem, problem);
    assert.ok(discovery.discoveryHash, workspace + ': missing discovery hash for ' + problem);
    assert.ok(discovery.sourceSearches.length > 0, workspace + ': no source searches for ' + problem);
    assert.equal(discovery.interventionUniverse.recommendationEligible, false);

    const candidates = discovery.candidates || [];
    assert.ok(candidates.every(candidate => candidate.discovery?.leadOnly === true));
    assert.ok(candidates.every(candidate => candidate.discovery?.effectsImported === false));

    const relevant = candidates.filter(candidate => interventionMatchesProblem(problem, candidate, workspace));
    const actionable = candidates.filter(candidate => isActionableInterventionTitle(candidate.name, candidate.discoveryText));
    const expectedTerms = taxonomyTerms(problem, workspace).map(term => term.toLowerCase());
    const expectedClassHits = candidates.filter(candidate =>
      expectedTerms.some(term => String(candidate.name + ' ' + candidate.discoveryText).toLowerCase().includes(term))
    ).length;
    const families = new Set(candidates.flatMap(candidate => candidate.interventionFamily || []));
    const expectedFamilies = expectedInterventionFamilies(problem, workspace);
    const expectedFamilyHits = expectedFamilies.filter(family => families.has(family));

    let evidence = null;
    if (candidates.length) {
      const evidenceStartedAt = Date.now();
      console.log(JSON.stringify({ event: 'baseline-evidence-start', case: index + 1, candidateCount: candidates.length }));
      evidence = await discoverCandidateUniverseEvidence({
        problem,
        candidates,
        rows: 2,
        maxCandidates: 1,
        maxSources: 2,
        maxQueriesPerSource: 2,
        signal
      });
      console.log(JSON.stringify({ event: 'baseline-evidence-complete', case: index + 1, durationMs: Date.now() - evidenceStartedAt, sourceSearchCount: evidence.candidateEvidence[0]?.sourceSearches?.length || 0 }));
      assert.equal(evidence.recommendationEligible, false);
      assert.equal(evidence.effectsImported, false);
      assert.ok(evidence.candidateEvidence.every(result => result.sourceSearches.length >= 2));
      assert.ok(evidence.candidateEvidence.every(result =>
        result.evidenceLeads.every(lead => lead.evidenceLeadOnly === true && lead.causalEffectImported === false)
      ));
    }

    const relevanceRatio = candidates.length ? relevant.length / candidates.length : 0;
    const evidenceResults = evidence?.candidateEvidence || [];
    const evidenceCompleteCandidate = evidenceResults.find(
      result => evidenceSufficiencyCount(result) >= 2
    );
    const independentEvidenceSources = evidenceCompleteCandidate
      ? evidenceSufficiencyCount(evidenceCompleteCandidate)
      : 0;
    const evidenceLeads = evidenceResults.reduce(
      (count, result) => count + (result.evidenceLeads?.length || 0), 0
    );

    let grade = 'BLOCKED';
    if (
      candidates.length > 0 &&
      actionable.length === candidates.length &&
      relevanceRatio >= 0.5 &&
      expectedClassHits > 0 &&
      independentEvidenceSources >= 2 &&
      evidenceLeads > 0 &&
      families.size >= 2
    ) {
      grade = 'STRONG';
    } else if (candidates.length > 0 && relevant.length > 0) {
      grade = 'USEFUL-INCOMPLETE';
    }

    return {
      workspace,
      jurisdiction,
      problem,
      measurementStatus: 'completed',
      candidateCount: candidates.length,
      actionableCount: actionable.length,
      relevantCount: relevant.length,
      relevanceRatio: Number(relevanceRatio.toFixed(2)),
      expectedClassHits,
      expectedFamilyHits: expectedFamilyHits.length,
      expectedFamilyCoverage: expectedFamilies.length
        ? Number((expectedFamilyHits.length / expectedFamilies.length).toFixed(2))
        : 1,
      interventionFamilies: [...families],
      evidenceLeads,
      independentEvidenceSources,
      evidenceComplete: evidence?.evidenceComplete ?? false,
      productionRelevanceRatio: Number((
        candidates.length
          ? relevant.length / candidates.length
          : 0
      ).toFixed(2)),
      candidateQualityDefects: candidates.filter(
        candidate => !isActionableInterventionTitle(candidate.name, candidate.discoveryText)
      ).length,
      topCandidates: candidates.slice(0, 5).map(candidate => candidate.name),
      grade,
      discoveryState: discovery.interventionUniverse.stoppingReason,
      sourceFailureCount: (discovery.sourceSearches || []).reduce((sum, source) => sum + (source.failedQueryCount || 0), 0),
      sourceEmptyCount: (discovery.sourceSearches || []).reduce((sum, source) => sum + (source.attempts || []).filter(attempt => attempt.status === 'searched-empty').length, 0),
      sourceSearchCount: discovery.sourceSearches?.length || 0,
      queryLayers: [...new Set((discovery.sourceSearches || []).flatMap(source => (source.attempts || []).map(attempt => attempt.queryLayer).filter(Boolean)))],
      attemptedQueries: (discovery.sourceSearches || []).reduce((sum, source) => sum + (source.queriesAttempted || 0), 0),
      missingFamilies: discovery.interventionUniverse.missingInterventionFamilies || [],
      missingClasses: discovery.interventionUniverse.missingInterventionClasses || []
    };
  });

  const gradeCounts = Object.fromEntries(
    ['STRONG', 'USEFUL-INCOMPLETE', 'BLOCKED'].map(grade => [
      grade,
      results.filter(result => result.grade === grade).length
    ])
  );
  const measuredResults = results.filter(result => result.measurementStatus === 'completed');
  const totalCandidates = measuredResults.reduce((sum, result) => sum + result.candidateCount, 0);
  const evidenceBackedCases = results.filter(
    result => result.independentEvidenceSources >= 2 && result.evidenceLeads > 0
  ).length;

  console.log(JSON.stringify({
    battery: 'VIDIK Discovery Quality Baseline — canonical 60-problem battery',
    cases: results.length,
    gradeCounts,
    completedDiscoveryCases: measuredResults.length,
    timedOutCases: results.filter(result => result.measurementStatus === 'timed-out').map(result => ({ workspace: result.workspace, jurisdiction: result.jurisdiction, problem: result.problem, error: result.baselineError })),
    averageCandidatesPerProblem: measuredResults.length ? Number((totalCandidates / measuredResults.length).toFixed(2)) : null,
    averageActionableRatio: Number((
      measuredResults.reduce(
        (sum, result) => sum + (result.candidateCount ? result.actionableCount / result.candidateCount : 0),
        0
      ) / (measuredResults.length || 1)
    ).toFixed(2)),
    casesWithExpectedInterventionClassHit: measuredResults.filter(result => result.expectedClassHits > 0).length,
    casesWithExpectedFamilyCoverage: measuredResults.filter(result => result.expectedFamilyHits > 0).length,
    averageExpectedFamilyCoverage: Number((
      measuredResults.reduce((sum, result) => sum + result.expectedFamilyCoverage, 0) / (measuredResults.length || 1)
    ).toFixed(2)),
    casesWithTwoIndependentEvidenceSources: evidenceBackedCases,
    casesWithNoCandidates: measuredResults.filter(result => result.candidateCount === 0).length,
    casesWithPerfectProductionRelevance: measuredResults.filter(
      result => result.candidateCount > 0 && result.productionRelevanceRatio === 1
    ).length,
    casesWithProductionRelevanceGaps: measuredResults.filter(
      result => result.productionRelevanceRatio < 1
    ).length,
    totalCandidateQualityDefects: measuredResults.reduce(
      (sum, result) => sum + result.candidateQualityDefects, 0
    ),
    diagnostic: {
      sourceDiagnosticsCases: measuredResults.length,
      casesWithSourceFailures: measuredResults.filter(result => result.sourceFailureCount > 0).length,
      totalSourceFailures: measuredResults.reduce((sum, result) => sum + result.sourceFailureCount, 0),
      casesWithSourceEmpties: measuredResults.filter(result => result.sourceEmptyCount > 0).length,
      totalSourceEmpties: measuredResults.reduce((sum, result) => sum + result.sourceEmptyCount, 0),
      averageQueriesAttemptedPerCase: measuredResults.length ? Number((measuredResults.reduce((sum, result) => sum + result.attemptedQueries, 0) / measuredResults.length).toFixed(2)) : null,
      queryLayerUsage: Object.fromEntries([...new Set(measuredResults.flatMap(result => result.queryLayers))].map(layer => [layer, measuredResults.filter(result => result.queryLayers.includes(layer)).length])),
      noCandidateCasesWithSourceFailure: results.filter(result => result.candidateCount === 0 && result.sourceFailureCount > 0).map(result => result.problem),
      noCandidateCasesWithAllSourcesEmpty: results.filter(result => result.candidateCount === 0 && result.sourceFailureCount === 0 && result.sourceEmptyCount >= result.sourceSearchCount && result.sourceSearchCount > 0).map(result => result.problem)
    },
    note: 'This is a measurement baseline, not a quality-threshold gate. Architectural invariants remain strict; quality grades are findings for comparison against later discovery work.'
  }, null, 2));
  console.log(JSON.stringify(results, null, 2));
  assert.equal(results.length, 60);
  assert.equal(measuredResults.length, 60, `all 60 live discovery cases must complete; completed=${measuredResults.length}; timedOut=${results.length - measuredResults.length}`);
  assert.ok(results.every(result => result.grade));
});

function evidenceSufficiencyCount(result) {
  return Number(result?.evidenceSufficiency?.independentSourceCount || 0);
}
