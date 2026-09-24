'use strict';

/*
 * VIDIK interface experiment.
 * Five presentation modes share the exact same live decision DOM and pipeline.
 * This file changes information architecture and emphasis only; it never changes
 * discovery, evidence, model, governance, or recommendation logic.
 */
(function () {
  const modes = {
    cockpit: {
      label: 'Decision Cockpit',
      title: 'Decide quickly without losing the trail.',
      intro: 'The default operating view: answer first, then the minimum evidence needed to interrogate it.',
      order: ['answerFirst','analysis','optionsSection','evidence','uncertaintySection','challengeSection','auditSection']
    },
    brief: {
      label: 'Executive Brief',
      title: 'The decision, in the order a leader needs it.',
      intro: 'Outcome, recommendation status, options, material uncertainty and challenge points are surfaced before technical detail.',
      order: ['answerFirst','optionsSection','uncertaintySection','challengeSection','evidence','auditSection']
    },
    workbench: {
      label: 'Analyst Workbench',
      title: 'Open the machinery behind the decision.',
      intro: 'Evidence, provenance, candidate universe, uncertainty and audit records become the primary workspace.',
      order: ['analysis','optionsSection','evidence','uncertaintySection','challengeSection','auditSection','answerFirst']
    },
    investigate: {
      label: 'Investigation',
      title: 'Interrogate the reasoning before you trust it.',
      intro: 'Why, why-not, uncertainty, challenge and evidence are treated as an investigation rather than a report.',
      order: ['answerFirst','challengeSection','uncertaintySection','evidence','optionsSection','analysis','auditSection']
    },
    map: {
      label: 'Decision Map',
      title: 'See how the decision is connected.',
      intro: 'The same decision object is arranged as a visual chain from problem through options, evidence, uncertainty, action and learning.',
      order: ['analysis','optionsSection','evidence','uncertaintySection','challengeSection','answerFirst','auditSection']
    }
  };

  function applyMode(mode) {
    const config = modes[mode] || modes.cockpit;
    document.body.dataset.interface = mode;
    document.documentElement.dataset.vidikInterface = mode;
    document.querySelectorAll('.interface-mode, .quick-mode').forEach(button => {
      button.classList.toggle('active', button.dataset.interface === mode);
      button.setAttribute('aria-pressed', button.dataset.interface === mode ? 'true' : 'false');
    });
    const label = document.getElementById('interfaceModeLabel');
    const quickLabel = document.getElementById('quickInterfaceLabel');
    if (label) label.textContent = config.label;
    if (quickLabel) quickLabel.textContent = config.label;

    const intro = document.querySelector('.interface-mode-intro');
    if (intro) intro.innerHTML = '<strong>' + escapeHtml(config.title) + '</strong><span>' + escapeHtml(config.intro) + '</span>';

    const analysis = document.getElementById('analysis');
    if (analysis) analysis.dataset.interfaceOrder = config.order.join(',');

    config.order.forEach((id, index) => {
      const node = document.getElementById(id);
      if (!node) return;
      node.style.order = String(index);
    });

    if (mode === 'map') {
      const chain = document.getElementById('pipeline');
      if (chain) chain.classList.add('map-chain');
    } else {
      document.getElementById('pipeline')?.classList.remove('map-chain');
    }

    try { localStorage.setItem('vidik-interface-mode', mode); } catch (_) {}
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function bind() {
    document.querySelectorAll('.interface-mode, .quick-mode').forEach(button => {
      button.addEventListener('click', () => applyMode(button.dataset.interface));
    });

    const analysis = document.getElementById('analysis');
    if (analysis) {
      const head = analysis.querySelector('.section-head');
      if (head && !head.querySelector('.interface-mode-intro')) {
        const p = head.querySelector('p');
        const intro = document.createElement('div');
        intro.className = 'interface-mode-intro';
        intro.innerHTML = '<strong>Decide quickly without losing the trail.</strong><span>The default operating view: answer first, then the minimum evidence needed to interrogate it.</span>';
        if (p) p.replaceWith(intro); else head.appendChild(intro);
      }
    }

    let saved = 'cockpit';
    try { saved = localStorage.getItem('vidik-interface-mode') || 'cockpit'; } catch (_) {}
    applyMode(modes[saved] ? saved : 'cockpit');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
