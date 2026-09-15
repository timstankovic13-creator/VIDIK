'use strict';
(function(){
  function esc(v){return typeof hEsc==='function'?hEsc(String(v??'')):String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}
  function state(ok,label){return '<span class="gui-engine-state '+(ok?'pass':'hold')+'">'+(ok?'✓ ':'○ ')+esc(label)+'</span>';}
  function render(){
    const root=document.getElementById('guiEngineReadiness');if(!root)return;
    const problem=(document.getElementById('decisionProblem')?.value||'').trim();
    const universe=typeof vidikUniverseForProblem==='function'&&problem?vidikUniverseForProblem(problem):[];
    const discoveryReady=Boolean(problem&&universe.length);
    const engine=window.VIDIK_PRODUCTION_INTELLIGENCE;
    const readiness=engine?.buildReadiness({discoveryComplete:discoveryReady,evidenceVerified:false,parametersAdmissible:false,optimizationValid:false,decisionArtifactPersisted:false,outcomeLearningReady:false});
    root.innerHTML='<div class="gui-engine-kicker">LIVE ENGINE STATE</div><div class="gui-engine-grid">'+
      '<div><span>01 · Discovery</span>'+state(discoveryReady,'Problem-matched universe identified')+'</div>'+
      '<div><span>02 · Evidence</span>'+state(false,'Verified / independently checked')+'</div>'+
      '<div><span>03 · Quantification</span>'+state(false,'Admissible parameter')+'</div>'+
      '<div><span>04 · Decision</span>'+state(false,'Optimization + recommendation')+'</div>'+
      '<div><span>05 · Audit</span>'+state(false,'Immutable decision artifact')+'</div>'+
      '<div><span>06 · Learning</span>'+state(false,'Outcome review / recalibration')+'</div></div>'+
      '<div class="gui-engine-note">'+(readiness?esc(readiness.passed)+' of '+esc(readiness.total)+' production layers currently satisfied by this browser surface. A registry match is discovery only; it never makes an intervention evidence-supported or recommendation-eligible.':'Engine readiness bridge unavailable — no substitute result is shown.')+'</div>';
  }
  function inject(){
    if(document.getElementById('guiEngineStyles'))return;
    const s=document.createElement('style');s.id='guiEngineStyles';s.textContent='.gui-engine{margin:12px 0}.gui-engine-kicker{font-size:.7rem;letter-spacing:.12em;font-weight:800;opacity:.6;margin-bottom:9px}.gui-engine-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.gui-engine-grid>div{padding:11px;border:1px solid rgba(100,110,130,.16);border-radius:12px;background:rgba(255,255,255,.55)}.gui-engine-grid span{display:block;font-size:.72rem;opacity:.65;margin-bottom:5px}.gui-engine-state{display:block;font-weight:800;font-size:.8rem}.gui-engine-state.pass{color:#236b43}.gui-engine-state.hold{color:#87651b}.gui-engine-note{margin-top:9px;font-size:.78rem;opacity:.72;line-height:1.35}@media(max-width:700px){.gui-engine-grid{grid-template-columns:1fr 1fr}}@media(max-width:420px){.gui-engine-grid{grid-template-columns:1fr}}';document.head.appendChild(s);
  }
  function init(){inject();const anchor=document.querySelector('.decision-hero');if(anchor&&!document.getElementById('guiEngineReadiness')){const section=document.createElement('section');section.id='guiEngineReadiness';section.className='card gui-engine';anchor.parentNode.insertBefore(section,anchor);}render();document.getElementById('decisionProblem')?.addEventListener('input',render);}
  window.VIDIK_GUI_PRODUCTION={render};window.addEventListener('DOMContentLoaded',init);
})();
