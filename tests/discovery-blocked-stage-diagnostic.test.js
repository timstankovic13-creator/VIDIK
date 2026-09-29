'use strict';

const test = require('node:test');
const { discoverSourceDrivenInterventions } = require('../js/source-driven-intervention-discovery');

const BLOCKED_19 = [
  ['municipal','CA','reduce pedestrian injuries'],
  ['municipal','CA','reduce extreme heat illness'],
  ['municipal','CA','reduce wildfire smoke exposure'],
  ['municipal','CA','reduce construction permitting delays'],
  ['municipal','CA','reduce residential energy burden'],
  ['municipal','AU','reduce bushfire smoke exposure'],
  ['business','US','reduce customer churn'],
  ['business','CA','reduce energy costs'],
  ['business','UK','improve hiring success'],
  ['business','AU','reduce delivery delays'],
  ['business','CA','improve accessibility for customers with disabilities'],
  ['community','US','improve disaster preparedness'],
  ['research','UK','evaluate ways to reduce hospital waiting times'],
  ['research','CA','study energy poverty interventions'],
  ['research','AU','study wildfire smoke mitigation'],
  ['research','AU','study interventions to improve rural mobility'],
  ['enterprise','US','reduce digital access gaps'],
  ['enterprise','CA','improve remote service delivery'],
  ['enterprise','UK','improve data governance']
];

test('VIDIK blocked-case stage diagnostic: classify source, retrieval, extraction, relevance and expansion stages', async () => {
  const results = [];
  for (const [workspace, jurisdiction, problem] of BLOCKED_19) {
    const discovery = await discoverSourceDrivenInterventions({
      problem, jurisdiction, workspace, rows: 10
    });
    const sources = (discovery.sourceSearches || []).map(source => ({
      sourceId: source.sourceId,
      sourceType: source.sourceType,
      jurisdiction: source.jurisdiction,
      status: source.status,
      queriesAttempted: source.queriesAttempted,
      failedQueryCount: source.failedQueryCount,
      usableQueryCount: source.usableQueryCount,
      skippedQueries: source.skippedQueries,
      failureClasses: source.failureClasses,
      failureStages: source.failureStages,
      routeExpansion: source.routeExpansion,
      terminalFailure: source.terminalFailure,
      recordsConsidered: source.recordsConsidered,
      candidatesReturned: source.candidatesReturned,
      attempts: (source.attempts || []).map(attempt => ({
        query: attempt.query,
        queryLayer: attempt.queryLayer,
        status: attempt.status,
        recordsConsidered: attempt.recordsConsidered,
        extractedCandidates: attempt.extractedCandidates,
        candidatesReturned: attempt.candidatesReturned,
        relevanceRejectedCount: attempt.relevanceRejectedCount,
        failureClass: attempt.failureClass || null,
        failureStage: attempt.failureStage || null,
        failureReason: attempt.failureReason || null,
        cumulativeUniqueCandidates: attempt.cumulativeUniqueCandidates,
        missingFamilies: attempt.missingFamilies || []
      }))
    }));
    results.push({
      workspace, jurisdiction, problem,
      candidateCount: discovery.candidates?.length || 0,
      stoppingReason: discovery.interventionUniverse?.stoppingReason,
      missingFamilies: discovery.interventionUniverse?.missingInterventionFamilies || [],
      missingClasses: discovery.interventionUniverse?.missingInterventionClasses || [],
      diagnosticCounts: discovery.interventionUniverse?.diagnosticCounts || {},
      sources
    });
  }

  const buckets = {
    allSourcesFailed: results.filter(r => r.sources.length && r.sources.every(s => s.status === 'search-failed')).length,
    allSourcesEmpty: results.filter(r => r.candidateCount === 0 && r.sources.length && r.sources.every(s => s.status === 'searched-empty')).length,
    extractionLoss: results.filter(r => r.sources.some(s => (s.attempts || []).some(a => a.recordsConsidered > 0 && a.extractedCandidates === 0))).length,
    relevanceLoss: results.filter(r => r.sources.some(s => (s.attempts || []).some(a => (a.extractedCandidates || 0) > (a.candidatesReturned || 0)))).length,
    candidatesRecoveredByFallback: results.filter(r => r.candidateCount > 0).length
  };

  console.log(JSON.stringify({
    diagnostic: 'blocked-19-stage-instrumentation',
    cases: results.length,
    buckets,
    results
  }, null, 2));
});
