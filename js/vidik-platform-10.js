/* VIDIK Platform 10.0 — unified decision lifecycle and governance kernel.
 * Deliberately dependency-light: the browser product can use it offline, while
 * server/adapter layers can replace the persistence boundary without changing
 * the decision contract.
 */
(function (global) {
  'use strict';

  var VERSION = '10.0.0';
  var REVIEWS = ['6-month', '1-year', '2-year', '5-year'];
  var AUDIENCES = ['municipal', 'government', 'business', 'community', 'research', 'enterprise', 'public'];
  var memory = global.localStorage;
  var KEY = 'VIDIK_PLATFORM_10_DECISIONS';
  var FAIL_KEY = 'VIDIK_PLATFORM_10_FAILURES';
  var KILL_KEY = 'VIDIK_PLATFORM_10_KILL_SWITCH';

  function now() { return new Date().toISOString(); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function id(prefix) { return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
  function finite(x) { return typeof x === 'number' && Number.isFinite(x); }
  function bounded(x) { return finite(x) && x >= 0 && x <= 1; }
  function read(key, fallback) { try { return memory ? JSON.parse(memory.getItem(key) || JSON.stringify(fallback)) : fallback; } catch (_) { return fallback; } }
  function write(key, value) { if (memory) memory.setItem(key, JSON.stringify(value)); }
  function hash(input) { var s = JSON.stringify(input), h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ('00000000' + (h >>> 0).toString(16)).slice(-8); }
  function fail(code, message, details) { return { ok: false, code: code, message: message, details: details || null }; }

  function validateDecision(d) {
    if (!d || typeof d !== 'object') return fail('INVALID_DECISION', 'Decision Object is required.');
    var required = ['id', 'audience', 'objective', 'problem', 'statusQuo', 'options', 'evidence', 'uncertainty', 'constraints'];
    for (var i = 0; i < required.length; i++) if (!(required[i] in d)) return fail('MISSING_FIELD', 'Decision Object is missing ' + required[i] + '.');
    if (AUDIENCES.indexOf(d.audience) < 0) return fail('INVALID_AUDIENCE', 'Unsupported decision audience.');
    if (!String(d.problem).trim()) return fail('EMPTY_PROBLEM', 'A problem/outcome is mandatory.');
    if (!d.statusQuo || !String(d.statusQuo.description || '').trim()) return fail('MISSING_STATUS_QUO', 'Status quo is mandatory.');
    if (!Array.isArray(d.options) || !d.options.length) return fail('NO_OPTIONS', 'At least one candidate option is required.');
    if (!Array.isArray(d.evidence)) return fail('INVALID_EVIDENCE', 'Evidence must be an array.');
    if (!d.uncertainty || !bounded(d.uncertainty.overall)) return fail('INVALID_UNCERTAINTY', 'Overall uncertainty must be a 0–1 value.');
    if (!d.constraints || typeof d.constraints !== 'object') return fail('INVALID_CONSTRAINTS', 'Constraints are mandatory.');
    return { ok: true };
  }

  function createDecision(input) {
    input = input || {};
    var d = {
      id: input.id || id('DEC'), version: VERSION, createdAt: now(), updatedAt: now(),
      audience: input.audience || 'municipal', objective: String(input.objective || input.problem || '').trim(),
      problem: String(input.problem || '').trim(), jurisdiction: input.jurisdiction || null,
      statusQuo: input.statusQuo || { description: '', baseline: null, source: null },
      interventionUniverse: Array.isArray(input.interventionUniverse) ? clone(input.interventionUniverse) : [],
      options: Array.isArray(input.options) ? clone(input.options) : [],
      evidence: Array.isArray(input.evidence) ? clone(input.evidence) : [],
      causalIdentification: input.causalIdentification || { status: 'UNKNOWN', rationale: null },
      productionFunction: input.productionFunction || null,
      marginalEffect: input.marginalEffect || null,
      uncertainty: input.uncertainty || { overall: 1, components: [], budget: null },
      opportunityCost: input.opportunityCost || { known: false, comparison: null },
      equity: input.equity || { assessed: false, impacts: [] },
      constraints: input.constraints || { budget: null, implementation: [], legal: [], capacity: [] },
      scenarios: Array.isArray(input.scenarios) ? clone(input.scenarios) : [],
      recommendation: null, overrides: [], outcomes: [], snapshots: [],
      governance: { integrity: null, drift: null, killSwitch: false, failures: [] },
      provenance: input.provenance || [], audit: []
    };
    var check = validateDecision(d); if (!check.ok) throw new Error(check.code + ': ' + check.message);
    d.audit.push({ event: 'CREATED', at: d.createdAt, hash: hash(d) });
    return d;
  }

  function scoreIntegrity(d) {
    var checks = [
      !!d.statusQuo.description, Array.isArray(d.evidence) && d.evidence.length > 0,
      d.causalIdentification && d.causalIdentification.status && d.causalIdentification.status !== 'UNKNOWN',
      bounded(d.uncertainty.overall), !!d.opportunityCost, !!d.equity,
      !!d.constraints, Array.isArray(d.provenance) && d.provenance.length > 0,
      Array.isArray(d.options) && d.options.length > 0
    ];
    var passed = checks.filter(Boolean).length;
    return { score: Math.round(100 * passed / checks.length), passed: passed, total: checks.length, complete: passed === checks.length };
  }

  function evaluate(d, evaluator) {
    var v = validateDecision(d); if (!v.ok) return v;
    if (read(KILL_KEY, false)) return fail('KILL_SWITCH', 'Decision evaluation is disabled by the governance kill switch.');
    var integrity = scoreIntegrity(d);
    var candidates = d.options.map(function (o) { return clone(o); });
    var admissible = candidates.filter(function (o) { return o && o.evidenceStatus !== 'BLOCKED' && o.unknown !== true; });
    var result = evaluator ? evaluator(clone(d), clone(admissible)) : { ranked: admissible };
    d.recommendation = result && result.recommended ? clone(result.recommended) : null;
    d.governance.integrity = integrity;
    d.updatedAt = now();
    d.audit.push({ event: 'EVALUATED', at: d.updatedAt, integrity: integrity, recommendation: d.recommendation ? d.recommendation.id : null, hash: hash(d) });
    return { ok: true, decision: d, integrity: integrity, result: result, admissible: admissible };
  }

  function calculateVOI(d, alternatives) {
    alternatives = Array.isArray(alternatives) ? alternatives : [];
    var current = d.recommendation && finite(d.recommendation.expectedValue) ? d.recommendation.expectedValue : 0;
    var best = alternatives.reduce(function (m, a) { return finite(a.expectedValue) ? Math.max(m, a.expectedValue) : m; }, current);
    var cost = alternatives.reduce(function (m, a) { return finite(a.informationCost) ? m + Math.max(0, a.informationCost) : m; }, 0);
    return { expectedValueOfInformation: Math.max(0, best - current), informationCost: cost, netVOI: Math.max(0, best - current - cost), recommendationCouldFlip: alternatives.some(function (a) { return a.id !== (d.recommendation && d.recommendation.id) && finite(a.expectedValue) && a.expectedValue > current; }) };
  }

  function sensitivity(d, scenarios) {
    var base = d.recommendation && d.recommendation.id;
    var flips = (Array.isArray(scenarios) ? scenarios : []).map(function (s) { return { id: s.id || id('SCN'), recommendation: s.recommendation || null, flips: !!s.recommendation && s.recommendation !== base, assumptions: clone(s.assumptions || {}) }; });
    return { baseline: base || null, scenarios: flips, recommendationFlips: flips.filter(function (x) { return x.flips; }) };
  }

  function persist(d) {
    var v = validateDecision(d); if (!v.ok) return v;
    d.updatedAt = now(); d.audit.push({ event: 'PERSISTED', at: d.updatedAt, hash: hash(d) });
    var all = read(KEY, {}); all[d.id] = clone(d); write(KEY, all);
    return { ok: true, id: d.id, artifactHash: hash(d), decision: clone(d) };
  }

  function snapshot(d) { var s = { id: id('SNAP'), decisionId: d.id, at: now(), state: clone(d), hash: hash(d) }; d.snapshots.push(s); d.audit.push({ event: 'SNAPSHOT', at: s.at, snapshotId: s.id, hash: s.hash }); return s; }

  function override(d, actor, adoptedAction, rationale) {
    if (!String(actor || '').trim() || !String(adoptedAction || '').trim() || !String(rationale || '').trim()) return fail('OVERRIDE_RATIONALE_REQUIRED', 'Actor, adopted action and rationale are mandatory for a human override.');
    var o = { id: id('OVR'), at: now(), actor: String(actor), adoptedAction: String(adoptedAction), rationale: String(rationale), priorRecommendation: clone(d.recommendation) };
    d.overrides.push(o); d.audit.push({ event: 'HUMAN_OVERRIDE', at: o.at, overrideId: o.id, hash: hash(o) }); return { ok: true, override: o };
  }

  function recordOutcome(d, checkpoint, predicted, observed) {
    if (REVIEWS.indexOf(checkpoint) < 0) return fail('INVALID_CHECKPOINT', 'Outcome checkpoint must be 6-month, 1-year, 2-year or 5-year.');
    if (!finite(predicted) || !finite(observed)) return fail('INVALID_OUTCOME', 'Predicted and observed outcomes must be numeric.');
    var o = { id: id('OUT'), decisionId: d.id, checkpoint: checkpoint, predicted: predicted, observed: observed, error: observed - predicted, at: now() };
    d.outcomes.push(o); d.audit.push({ event: 'OUTCOME_RECORDED', at: o.at, outcomeId: o.id, hash: hash(o) }); return { ok: true, outcome: o };
  }

  function drift(d, tolerance) {
    tolerance = finite(tolerance) ? Math.max(0, tolerance) : 0.2;
    var recent = d.outcomes[d.outcomes.length - 1];
    var rate = recent && finite(recent.predicted) && recent.predicted !== 0 ? Math.abs(recent.error / recent.predicted) : null;
    var detected = rate !== null && rate > tolerance;
    d.governance.drift = { detected: detected, errorRate: rate, tolerance: tolerance, at: now() };
    return clone(d.governance.drift);
  }

  function failure(code, message, severity) {
    var f = { id: id('FAIL'), code: code, message: message, severity: severity || 'warning', at: now() };
    var all = read(FAIL_KEY, []); all.push(f); write(FAIL_KEY, all); return f;
  }

  function setKillSwitch(enabled, reason) { write(KILL_KEY, !!enabled); return { enabled: !!enabled, reason: reason || null, at: now() }; }
  function exportArtifact(d) { var payload = { schema: 'VIDIK-DECISION-10', version: VERSION, exportedAt: now(), decision: clone(d), integrity: scoreIntegrity(d) }; return JSON.stringify(payload, null, 2); }
  function importArtifact(raw) { try { var p = typeof raw === 'string' ? JSON.parse(raw) : raw; if (!p || p.schema !== 'VIDIK-DECISION-10') return fail('INVALID_ARTIFACT', 'Unsupported VIDIK artifact schema.'); var v = validateDecision(p.decision); return v.ok ? { ok: true, decision: p.decision } : v; } catch (_) { return fail('INVALID_ARTIFACT', 'Artifact is not valid JSON.'); } }

  global.VIDIK_PLATFORM_10 = {
    VERSION: VERSION, AUDIENCES: AUDIENCES, REVIEW_CHECKPOINTS: REVIEWS,
    createDecision: createDecision, validateDecision: validateDecision, evaluate: evaluate,
    scoreIntegrity: scoreIntegrity, calculateVOI: calculateVOI, sensitivity: sensitivity,
    persist: persist, snapshot: snapshot, override: override, recordOutcome: recordOutcome,
    detectDrift: drift, recordFailure: failure, setKillSwitch: setKillSwitch,
    exportArtifact: exportArtifact, importArtifact: importArtifact,
    getDecision: function (decisionId) { return read(KEY, {})[decisionId] || null; },
    listDecisions: function () { return Object.values(read(KEY, {})); },
    listFailures: function () { return read(FAIL_KEY, []); },
    isKilled: function () { return !!read(KILL_KEY, false); }
  };
})(window);
