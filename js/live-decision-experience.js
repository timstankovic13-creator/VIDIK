'use strict';

/*
 * VIDIK live decision experience.
 * The primary municipal CTA must invoke the production decision pipeline,
 * not the legacy local demo renderer. Discovery remains fail-closed.
 */
(function () {
  function esc(value) {
    if (typeof hEsc === 'function') return hEsc(String(value ?? ''));
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function renderLiveDecision(result, problem) {
    const allowed = result?.governance?.recommendationAllowed === true;
    const rawCandidates = Array.isArray(result?.candidates) ? result.candidates : [];
    const seenCandidates = new Set();
    const candidates = rawCandidates.filter(candidate => {
      const key = String(candidate?.id || candidate?.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (!key || seenCandidates.has(key)) return false;
      seenCandidates.add(key);
      return true;
    });
    const searches = Array.isArray(result?.evidenceSearches) ? result.evidenceSearches : [];
    const evidenceDiscovery = Array.isArray(result?.evidenceDiscovery) ? result.evidenceDiscovery : [];
    const evidenceByCandidate = new Map(evidenceDiscovery.map(item => [item.candidateId, item]));
    const universe = result?.governance?.candidateUniverseIntelligence || {};
    const status = allowed ? 'Recommendation ready' : 'Recommendation blocked — evidence boundary preserved';

    setText('gate', status);
    setText('rec', allowed ? 'READY' : 'BLOCKED');
    setText('admissible', allowed ? 'Yes' : 'No');
    setText('verified', searches.filter(x => ['verified','complete','candidates-found'].includes(x.status)).length);
    setText('evcount', searches.length);
    setText('lineage', candidates.every(x => Array.isArray(x.discovery?.provenance) && x.discovery.provenance.length) ? 'Present' : 'Incomplete');

    const recommendation = result?.decision?.recommendation || null;
    const answer = document.getElementById('answerFirst');
    if (answer) {
      answer.innerHTML =
        '<div class="answer-kicker">LIVE VIDIK DECISION</div>' +
        '<h2>' + (allowed ? 'Recommendation available' : 'No defensible recommendation yet') + '</h2>' +
        '<div class="answer-main">' +
          (allowed ? esc(recommendation) : 'VIDIK completed the live discovery and evidence path but will not manufacture a recommendation when its decision gates are not satisfied.') +
        '</div>' +
        '<div class="answer-grid">' +
          '<div class="answer-tile"><span>Problem</span><b>' + esc(problem) + '</b></div>' +
          '<div class="answer-tile"><span>Options discovered</span><b>' + candidates.length + '</b></div>' +
          '<div class="answer-tile"><span>Evidence searches</span><b>' + searches.length + '</b></div>' +
          '<div class="answer-tile"><span>Decision gate</span><b>' + (allowed ? 'Recommendation eligible' : 'Blocked until evidence / model gates are satisfied') + '</b></div>' +
        '</div>' +
        '<div class="answer-action"><strong>What VIDIK found</strong><div class="answer-muted">' +
          (candidates.length ? candidates.slice(0, 8).map(x => esc(x.name || x.id)).join(' · ') : 'No admissible intervention candidates were returned.') +
        '</div></div>' +
        '<div class="answer-action"><strong>Universe integrity</strong><div class="answer-muted">' +
          esc(String(universe.status || 'unknown')) + ' · ' + esc(String(universe.uniqueCandidateNames ?? candidates.length)) +
          ' unique candidate names · status quo preserved: ' + (universe.statusQuoPreserved ? 'yes' : 'no') +
        '</div></div>';
    }

    const candidateBox = document.getElementById('candidates');
    if (candidateBox) {
      candidateBox.innerHTML = candidates.length
        ? candidates.map(x =>
            '<article class="candidate"><div class="candidate-title"><b>' + esc(x.name || x.id) + '</b></div><div class="row"><span>Evidence state</span><b>' +
            esc((evidenceByCandidate.get(x.id)?.evidenceLeads?.length ? `${evidenceByCandidate.get(x.id).evidenceLeads.length} literature leads` : 'Evidence search pending / none found')) + '</b></div><div class="row"><span>Discovery</span><b>' +
            esc(x.discovery?.sourceType || 'unknown') + (x.discovery?.leadOnly ? ' · lead only' : '') +
            '</b></div></article>'
          ).join('')
        : '<p>No candidates returned. VIDIK records the empty discovery state rather than inventing options.</p>';
    }

    const evidenceBox = document.getElementById('evidenceTable');
    if (evidenceBox) {
      evidenceBox.innerHTML =
        '<tr><th>Option</th><th>Evidence found</th><th>Independent sources</th></tr>' +
        (candidates.length ? candidates.map(x => { const item = evidenceByCandidate.get(x.id); const leads = Array.isArray(item?.evidenceLeads) ? item.evidenceLeads : []; const sources = [...new Set(leads.filter(l => ['candidate-match','verified'].includes(l.relevanceStatus)).map(l => l.sourceId))]; return '<tr><td>' + esc(x.name || x.id) + '</td><td>' + (leads.length ? leads.length + ' relevant literature leads' : 'No matched literature yet') + '</td><td>' + (sources.length ? sources.length : '—') + '</td></tr>'; }).join('') : '<tr><td colspan="3">No candidates returned for evidence review.</td></tr>');
    }

    const governance = document.getElementById('audit');
    if (governance) governance.textContent = JSON.stringify({
      recommendationAllowed: allowed,
      decisionStatus: result?.governance?.decisionStatus || null,
      candidateUniverseIntelligence: universe,
      whyNotAvailable: result?.governance?.whyNotAvailable === true,
      runHash: result?.runHash || null
    }, null, 2);

    const top = document.getElementById('topRecommendation');
    if (top) top.textContent = allowed && recommendation ? recommendation : 'No defensible recommendation yet';
    setText('topImpact', allowed ? 'ADMISSIBLE' : 'BLOCKED');
    setText('topIntegrity', allowed ? 'Verified gates' : 'Evidence boundary');
    setText('topSummary', allowed
      ? 'VIDIK produced a recommendation from the live decision pipeline. Inspect the evidence and alternatives before acting.'
      : 'VIDIK completed live discovery without substituting an unsupported recommendation.');

    document.getElementById('answerFirst')?.scrollIntoView({behavior:'smooth', block:'start'});
  }

  async function runLiveMunicipalDecision(event) {
    event.preventDefault();
    const input = document.getElementById('decisionProblem');
    const button = document.getElementById('runDecision');
    const problem = input?.value?.trim() || '';
    if (!problem) {
      setText('gate', 'Tell VIDIK what you are deciding first.');
      input?.focus();
      return;
    }
    window.dispatchEvent(new CustomEvent('vidik:decision-start', { detail: { problem } }));

    button.disabled = true;
    setText('gate', 'VIDIK is searching sources and acquiring evidence…');
    try {
      const city = document.getElementById('city')?.value || 'Ottawa';
      const pool = Number(document.getElementById('pool')?.value);
      const risk = Number(document.getElementById('risk')?.value);
      const response = await fetch('/api/decision/discover', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          problem,
          jurisdiction: city === 'Ottawa' || city === 'Toronto' ? 'CA' : 'AU',
          statusQuo: 'Continue current practice',
          audience: document.getElementById('audienceSelect')?.value || 'municipal',
          workspace: {city, budget: Number.isFinite(pool) ? pool : null, riskCeiling: Number.isFinite(risk) ? risk : null}
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'decision-analysis-failed');
      renderLiveDecision(result, problem);
    } catch (error) {
      setText('gate', 'Live decision failed — no substitute result shown');
      const answer = document.getElementById('answerFirst');
      if (answer) answer.innerHTML =
        '<div class="answer-kicker">LIVE VIDIK DECISION</div><h2>VIDIK could not complete the live analysis.</h2>' +
        '<div class="answer-main">' + esc(error.message || 'Unknown error') + '</div>' +
        '<div class="answer-action"><strong>Evidence boundary preserved</strong><div class="answer-muted">No cached or hand-selected recommendation is substituted for a failed live run.</div></div>';
    } finally {
      button.disabled = false;
    }
  }

  function bind() {
    const button = document.getElementById('runDecision');
    if (!button || button.dataset.liveDecisionBound) return;
    button.dataset.liveDecisionBound = 'true';
    button.addEventListener('click', runLiveMunicipalDecision, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
