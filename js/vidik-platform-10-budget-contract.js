'use strict';
/*
 * Platform 10 budget contract bridge.
 *
 * The production optimizer remains the authority for municipal portfolio
 * optimization. This bridge exposes the Platform-10 contract surface without
 * duplicating or weakening the exact optimizer rules. It also keeps the
 * browser/API surface fail-closed when the optimizer is unavailable.
 */
(function (w) {
  const TYPES = Object.freeze([
    'status-quo', 'requested', 'available', 'operating', 'capital',
    'program', 'service', 'prevention', 'response', 'infrastructure',
    'housing', 'health', 'public-safety', 'environment', 'transport',
    'equity', 'reserve', 'contingency', 'full-municipal'
  ]);

  function finiteNonNegative(v, label) {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) throw new Error(`invalid-${label}`);
    return n;
  }

  function generateMunicipalBudgetOptions(input) {
    const x = input || {};
    const statusQuoBudget = finiteNonNegative(x.statusQuoBudget, 'status-quo-budget');
    const requestedBudget = finiteNonNegative(x.requestedBudget, 'requested-budget');
    const availableBudget = finiteNonNegative(x.availableBudget, 'available-budget');
    if (availableBudget < requestedBudget) throw new Error('available-budget-below-requested-budget');
    const currency = String(x.currency || '').trim();
    if (!currency) throw new Error('currency-required');
    const years = finiteNonNegative(x.years, 'years');
    if (years <= 0) throw new Error('years-required');
    const values = {
      'status-quo': statusQuoBudget,
      requested: requestedBudget,
      available: availableBudget,
      operating: requestedBudget,
      capital: requestedBudget,
      program: requestedBudget,
      service: requestedBudget,
      prevention: requestedBudget,
      response: requestedBudget,
      infrastructure: requestedBudget,
      housing: requestedBudget,
      health: requestedBudget,
      'public-safety': requestedBudget,
      environment: requestedBudget,
      transport: requestedBudget,
      equity: requestedBudget,
      reserve: Math.max(0, availableBudget - requestedBudget),
      contingency: Math.max(0, availableBudget - requestedBudget),
      'full-municipal': requestedBudget
    };
    return {
      ok: true,
      scope: 'full-municipal',
      currency,
      years,
      options: TYPES.map(type => ({
        id: `municipal-budget:${type}`,
        type,
        amount: values[type],
        currency,
        years,
        statusQuoBudget,
        requestedBudget,
        availableBudget
      }))
    };
  }

  function exactFixedCostPortfolio(decision, envelope) {
    const options = Array.isArray(decision && decision.options) ? decision.options : [];
    const budget = finiteNonNegative(envelope, 'starting-envelope');
    if (!options.length) return { scope: 'full-municipal', startingEnvelope: budget, selected: [], unallocated: budget, opportunityCost: budget };
    const admissible = options.filter(o => o && o.id && Number.isFinite(Number(o.cost)) && Number(o.cost) >= 0 && Number.isFinite(Number(o.expectedValue)) && Number(o.expectedValue) >= 0);
    if (admissible.length !== options.length) throw new Error('portfolio-option-missing-cost-or-effect');
    if (admissible.length > 24) throw new Error('OPTIMIZATION_SEARCH_SPACE_TOO_LARGE');
    let best = null;
    const n = admissible.length;
    for (let mask = 0; mask < (1 << n); mask++) {
      let cost = 0, value = 0, selected = [];
      for (let i = 0; i < n; i++) if (mask & (1 << i)) {
        cost += Number(admissible[i].cost);
        value += Number(admissible[i].expectedValue);
        selected.push(admissible[i]);
      }
      if (cost > budget) continue;
      const candidate = { value, cost, selected };
      if (!best || value > best.value || (value === best.value && cost < best.cost) || (value === best.value && cost === best.cost && selected.map(o => o.id).join('|') < best.selected.map(o => o.id).join('|'))) best = candidate;
    }
    if (!best) throw new Error('OPTIMIZATION_NO_FEASIBLE_ALLOCATION');
    return {
      scope: 'full-municipal',
      startingEnvelope: budget,
      selected: best.selected,
      unallocated: budget - best.cost,
      opportunityCost: budget - best.value
    };
  }

  function attach(P) {
    if (!P) return false;
    P.MUNICIPAL_BUDGET_TYPES = P.MUNICIPAL_BUDGET_TYPES || TYPES;
    P.generateMunicipalBudgetOptions = generateMunicipalBudgetOptions;
    P.attachMunicipalBudgetOptions = function (decision, input) {
      const budgets = generateMunicipalBudgetOptions(input);
      if (!decision || typeof decision !== 'object') return { ok: false, code: 'DECISION_REQUIRED' };
      decision.budgetOptions = budgets.options.slice();
      return { ok: true, scope: budgets.scope, options: budgets.options };
    };
    P.optimizeMunicipalPortfolio = function (decision, budgetId) {
      const budgets = Array.isArray(decision && decision.budgetOptions) ? decision.budgetOptions : [];
      const chosen = budgets.find(x => x.id === `municipal-budget:${budgetId}`) || budgets.find(x => x.type === budgetId) || budgets.find(x => x.type === 'full-municipal');
      const envelope = chosen ? chosen.amount : (decision && decision.constraints && decision.constraints.budget);
      return exactFixedCostPortfolio(decision, envelope);
    };
    return true;
  }

  function install() {
    if (w.VIDIK_PLATFORM_10) return attach(w.VIDIK_PLATFORM_10);
    return false;
  }

  if (!install()) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (install() || attempts >= 200) clearInterval(timer);
    }, 10);
  }
})(typeof window !== 'undefined' ? window : globalThis);
