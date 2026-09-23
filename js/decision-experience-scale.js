'use strict';

(function () {
  const answer = document.getElementById('answerFirst');
  if (!answer) return;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function money(value) {
    if (!Number.isFinite(Number(value))) return '—';
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(Number(value));
  }

  function render(result) {
    const budget = result.budget || {};
    const allocation = result.allocation || {};
    const requested = budget.requested;
    if (!requested) {
      answer.querySelector('.scale-plan')?.remove();
      return;
    }
    const title = budget.scope === 'full-budget' ? 'Whole budget' : budget.scope === 'portfolio' ? 'Several decisions' : 'One decision';
    let body;
    if (allocation.status === 'allocation-ready') {
      const items = Object.entries(allocation.optimizer.allocations || {}).map(([id, amount]) => {
        const row = (allocation.optimizer.rows || []).find(x => x.id === id);
        return '<div class="allocation-row"><span>' + esc(row?.name || id) + '</span><b>' + money(amount) + '</b></div>';
      }).join('');
      body = '<p><strong>Validated allocation available.</strong> VIDIK is optimizing the discretionary pool, not committed spending.</p>' +
        '<div class="allocation-list">' + items + '</div>' +
        '<small>Discretionary pool: ' + money(budget.budget?.discretionaryAmount) + ' · ' +
        (allocation.optimizer.conserved ? 'Every available dollar allocated.' : 'Some dollars remain unallocated.') + '</small>';
    } else {
      body = '<p><strong>Allocation is not yet admissible.</strong> VIDIK found a budget request, but it will not invent costs, marginal effects, capacity or department constraints.</p>' +
        '<div class="allocation-block"><span>What is missing</span><b>' + esc(allocation.reason || 'validated allocation-ready options') + '</b></div>' +
        '<small>The decision can continue once those inputs are evidenced and bounded.</small>';
    }
    const old = answer.querySelector('.scale-plan');
    if (old) old.remove();
    const section = document.createElement('div');
    section.className = 'scale-plan';
    section.innerHTML = '<div class="answer-kicker">DECISION SCALE · ' + esc(title) + '</div><h3>Resource plan</h3>' +
      '<div class="scale-summary"><div><span>Budget identified</span><b>' + money(budget.budget?.amount || budget.amount) + '</b></div>' +
      '<div><span>Objective</span><b>' + esc(budget.objective || 'optimize-resource-allocation') + '</b></div></div>' + body;
    answer.appendChild(section);
  }

  window.VIDIKRenderBudget = render;

  async function run(problem, audience, jurisdiction, statusQuo, workspace) {
    const response = await fetch('/api/decision/discover', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({ problem, audience, jurisdiction, statusQuo, workspace })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'decision-analysis-failed');
    render(result);
    return result;
  }

  const municipalButton = document.getElementById('runDecision');
  const municipalProblem = document.getElementById('decisionProblem');
  if (municipalButton && municipalProblem) {
    municipalButton.addEventListener('click', async function () {
      const problem = municipalProblem.value.trim();
      if (!problem) return;
      municipalButton.disabled = true;
      municipalButton.textContent = 'Analyzing…';
      try {
        await run(problem, 'municipal', document.getElementById('city')?.value || 'Ottawa', 'Continue current practice', {});
      } catch (error) {
        render({ budget: { requested: true, scope: 'single-decision', objective: null }, allocation: { status: 'blocked', reason: error.message } });
      } finally {
        municipalButton.disabled = false;
        municipalButton.innerHTML = 'Analyze decision <span>→</span>';
      }
    });
  }

})();
