'use strict';

function finite(value) {
  return Number.isFinite(Number(value));
}

function normalizeBounds(row) {
  const point = Number(row.effect);
  const low = finite(row.uncertainty?.low) ? Number(row.uncertainty.low) : point;
  const high = finite(row.uncertainty?.high) ? Number(row.uncertainty.high) : point;
  if (!finite(point) || !finite(low) || !finite(high) || low > high) {
    throw new Error(`invalid-uncertainty-bounds:${row.id}`);
  }
  if (!finite(row.resource) || Number(row.resource) <= 0) {
    throw new Error(`invalid-resource:${row.id}`);
  }
  return { low, high };
}

function rankAt(rows, selector) {
  return rows
    .map(row => ({ id: row.id, efficiency: selector(row) / Number(row.resource) }))
    .sort((a, b) => b.efficiency - a.efficiency || a.id.localeCompare(b.id));
}

function buildSensitivityAnalysis(rows = [], options = {}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      status: 'NOT_ACTIVATED',
      scenarios: [],
      recommendation: null,
      recommendationFlips: [],
      robust: false,
      feedback: 'No quantitatively admissible candidates are available for sensitivity analysis.'
    };
  }

  const normalized = rows.map(row => ({ ...row, bounds: normalizeBounds(row) }));
  const pointRanking = rankAt(normalized, row => Number(row.effect));
  const pointRecommendation = pointRanking[0]?.id || null;

  const scenarios = [];
  for (const target of normalized) {
    for (const bound of ['low', 'high']) {
      const ranking = rankAt(normalized, row => row.id === target.id ? target.bounds[bound] : Number(row.effect));
      scenarios.push({
        variedCandidateId: target.id,
        bound,
        recommendation: ranking[0]?.id || null,
        ranking: ranking.map(item => item.id),
        efficiencies: Object.fromEntries(ranking.map(item => [item.id, item.efficiency]))
      });
    }
  }

  const recommendationFlips = scenarios.filter(s => s.recommendation !== pointRecommendation);
  const candidateRobustness = Object.fromEntries(normalized.map(row => {
    const affected = scenarios.filter(s => s.variedCandidateId === row.id);
    return [row.id, {
      pointEfficiency: Number(row.effect) / Number(row.resource),
      lowEfficiency: row.bounds.low / Number(row.resource),
      highEfficiency: row.bounds.high / Number(row.resource),
      changesRecommendation: affected.some(s => s.recommendation !== pointRecommendation)
    }];
  }));

  const selected = normalized.find(row => row.id === pointRecommendation);
  const selectedWorst = selected ? selected.bounds.low / Number(selected.resource) : null;
  const competitorsBest = normalized
    .filter(row => row.id !== pointRecommendation)
    .map(row => row.bounds.high / Number(row.resource));
  const robust = selectedWorst !== null && competitorsBest.every(value => selectedWorst >= value);

  return {
    status: 'ANALYZED',
    pointRecommendation,
    scenarios,
    recommendationFlips,
    candidateRobustness,
    robust,
    robustCondition: selected ? {
      selectedCandidateId: selected.id,
      selectedWorstCaseEfficiency: selectedWorst,
      strongestCompetitorBestCaseEfficiency: competitorsBest.length ? Math.max(...competitorsBest) : null
    } : null,
    feedback: recommendationFlips.length
      ? 'Recommendation changes under at least one explicit uncertainty scenario; treat the point recommendation as sensitivity-dependent and acquire decision-relevant evidence before treating it as robust.'
      : robust
        ? 'Point recommendation remains unchanged across tested single-parameter uncertainty bounds and the selected candidate remains above every competitor worst/best-case efficiency comparison.'
        : 'Point recommendation did not flip in tested scenarios, but the selected candidate is not separated from every competitor across full uncertainty bounds.'
  };
}

module.exports = { buildSensitivityAnalysis, normalizeBounds };
