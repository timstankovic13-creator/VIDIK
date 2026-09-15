'use strict';
(function(){
  const esc = value => typeof hEsc === 'function' ? hEsc(String(value ?? '')) : String(value ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const text = id => (document.getElementById(id)?.textContent || '').trim();
  function status(label, value, kind = 'hold') { return `<div class="production-gui-status ${kind}"><span>${esc(label)}</span><b>${esc(value || '—')}</b></div>`; }
  function collectState(){
    const problem = (document.getElementById('decisionProblem')?.value || '').trim();
    const recommendation = text('recommendation');
    const candidates = document.getElementById('candidates');
    const candidateCount = candidates ? candidates.querySelectorAll('[data-candidate-id], .candidate, .candidate-card, .option-card').length : 0;
    const evidenceRows = document.querySelectorAll('#evidenceTable tr').length;
    const audit = text('audit');
    const persisted = /persisted|integrity|DecisionArtifact/i.test(text('lifecycleStatus') + audit);
    const blocked = !problem || /NO RECOMMENDATION|cannot establish|BLOCKED/i.test(recommendation + text('gate'));
    return { problem, candidateCount, evidenceRows, recommendation: recommendation || null, blocked, persisted, auditPresent: Boolean(audit) };
  }
  function render(){
    const root = document.getElementById('productionDecisionGui');
    if(!root) return;
    const s = collectState();
    const evidence = s.evidenceRows ? `${s.evidenceRows} evidence record${s.evidenceRows === 1 ? '' : 's'} surfaced` : 'No evidence records surfaced';
    const candidate = s.candidateCount ? `${s.candidateCount} option${s.candidateCount === 1 ? '' : 's'} surfaced` : 'No matched options surfaced';
    root.innerHTML = `<div class="production-gui-kicker">LIVE DECISION CHAIN</div><h2>${s.problem ? esc(s.problem) : 'Define the problem'}</h2><p class="production-gui-lead">VIDIK keeps discovery, evidence, quantification and recommendation separate. A catalogue match is not itself an admissible intervention.</p><div class="production-gui-grid">${status('01 · Problem', s.problem ? 'Defined' : 'Waiting', s.problem ? 'pass' : 'hold')}${status('02 · Intervention universe', candidate, s.candidateCount ? 'pass' : 'hold')}${status('03 · Evidence', evidence, s.evidenceRows ? 'pass' : 'hold')}${status('04 · Recommendation', s.blocked ? 'Blocked / limited' : (s.recommendation || 'Pending'), s.blocked ? 'hold' : 'pass')}${status('05 · Audit', s.persisted ? 'Decision artifact present' : (s.auditPresent ? 'Analysis audit present' : 'Not persisted'), s.persisted ? 'pass' : 'hold')}${status('06 · Outcome learning', text('v96Status') || 'Review lifecycle available', 'pass')}</div><div class="production-gui-actions"><button type="button" data-gui-jump="optionsSection">Inspect options</button><button type="button" data-gui-jump="evidence">Inspect evidence</button><button type="button" data-gui-jump="uncertaintySection">Inspect uncertainty / VOI</button><button type="button" data-gui-jump="auditSection">Inspect audit</button></div>`;
    root.querySelectorAll('[data-gui-jump]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.guiJump)?.scrollIntoView({behavior:'smooth',block:'start'})));
    window.VIDIK_GUI_STATE = Object.freeze(s);
  }
  function init(){
    if(document.getElementById('productionDecisionGui')) return;
    const anchor = document.querySelector('.decision-hero');
    if(!anchor) return;
    const root = document.createElement('section'); root.id='productionDecisionGui'; root.className='card production-gui'; anchor.parentNode.insertBefore(root, anchor.nextSibling);
    const style = document.createElement('style'); style.id='productionGuiStyles'; style.textContent=`.production-gui{margin:12px 0}.production-gui-kicker{font-size:.7rem;letter-spacing:.12em;font-weight:800;opacity:.62}.production-gui h2{margin:.3rem 0}.production-gui-lead{font-size:.85rem;line-height:1.4;opacity:.72;max-width:760px}.production-gui-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.production-gui-status{border:1px solid rgba(100,110,130,.18);border-radius:12px;padding:11px;background:rgba(255,255,255,.55)}.production-gui-status span{display:block;font-size:.68rem;letter-spacing:.04em;opacity:.62;margin-bottom:5px}.production-gui-status b{font-size:.82rem;line-height:1.25}.production-gui-status.pass b{color:#236b43}.production-gui-status.hold b{color:#87651b}.production-gui-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}.production-gui-actions button{border:1px solid rgba(80,90,110,.2);border-radius:10px;padding:9px 11px;background:transparent;font-weight:700;cursor:pointer}@media(max-width:700px){.production-gui-grid{grid-template-columns:1fr 1fr}}@media(max-width:420px){.production-gui-grid{grid-template-columns:1fr}}`; document.head.appendChild(style);
    render();
    const problem = document.getElementById('decisionProblem');
    problem?.addEventListener('input', render);
    ['recommendation','candidates','evidenceTable','audit','lifecycleStatus','v96Status','gate'].forEach(id => { const node=document.getElementById(id); if(node) new MutationObserver(render).observe(node,{subtree:true,childList:true,characterData:true,attributes:true}); });
  }
  // config.js injects this script dynamically; DOMContentLoaded may already have fired.
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  window.VIDIK_PRODUCTION_GUI = { render, collectState, init };
})();
