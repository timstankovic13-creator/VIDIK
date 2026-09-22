const DEFAULT_THRESHOLDS = Object.freeze({
  maxFirstAnswerMs: 5000,
  maxDefensibleAnswerMs: 15000,
  minAuditCompleteness: 1,
  maxHumanCorrectionRate: 0.25,
});

function percentile(values, p) {
  const xs = [...values].sort((a, b) => a - b);
  if (!xs.length) return null;
  const i = (xs.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? xs[lo] : xs[lo] + (xs[hi] - xs[lo]) * (i - lo);
}

function scoreRun(run, thresholds = DEFAULT_THRESHOLDS) {
  const first = run.firstAnswerMs ?? null;
  const defensible = run.defensibleAnswerMs ?? null;
  const audit = run.auditCompleteness ?? 0;
  const correction = run.humanCorrectionRate ?? 1;
  return {
    firstAnswerPass: first !== null && first <= thresholds.maxFirstAnswerMs,
    defensibleAnswerPass: defensible !== null && defensible <= thresholds.maxDefensibleAnswerMs,
    auditPass: audit >= thresholds.minAuditCompleteness,
    correctionPass: correction <= thresholds.maxHumanCorrectionRate,
    appropriatelyBlocked: run.status === 'NO_RECOMMENDATION' && run.effectEstimate == null && run.roi == null,
  };
}

function benchmark(runs, thresholds = DEFAULT_THRESHOLDS) {
  if (!Array.isArray(runs) || !runs.length) throw new Error('benchmark requires at least one run');
  const scores = runs.map(r => scoreRun(r, thresholds));
  const first = runs.map(r => r.firstAnswerMs).filter(Number.isFinite);
  const defensible = runs.map(r => r.defensibleAnswerMs).filter(Number.isFinite);
  const correction = runs.map(r => r.humanCorrectionRate).filter(Number.isFinite);
  const pass = key => scores.filter(s => s[key]).length / scores.length;
  return {
    n: runs.length,
    p50FirstAnswerMs: percentile(first, 0.5),
    p95FirstAnswerMs: percentile(first, 0.95),
    p50DefensibleAnswerMs: percentile(defensible, 0.5),
    p95DefensibleAnswerMs: percentile(defensible, 0.95),
    firstAnswerPassRate: pass('firstAnswerPass'),
    defensibleAnswerPassRate: pass('defensibleAnswerPass'),
    auditPassRate: pass('auditPass'),
    humanCorrectionPassRate: pass('correctionPass'),
    appropriateBlockRate: pass('appropriatelyBlocked'),
    reproducible: runs.every(r => r.reproducible === true),
  };
}

module.exports = { DEFAULT_THRESHOLDS, percentile, scoreRun, benchmark };
