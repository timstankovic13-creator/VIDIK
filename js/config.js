'use strict';
const V={version:'9.2.0',city:'Ottawa',currency:'CAD',objective:{id:'verified-outcome-improvement',unit:'candidate-specific verified outcome metric',comparability:'required'},weights:{need:.18,effect:.32,capacity:.14,feasibility:.14,equity:.10,risk:.12}};

(function(){
  const s=document.createElement('style');
  s.textContent=`.analysis-area>details.advanced.card{display:block !important}body.vidik-details-open .analysis-tabs{display:flex !important}body.vidik-details-open .analysis-area>.analysis-heading{display:block !important}body.vidik-details-open .analysis-area>.card{display:block !important}body.vidik-details-open .analysis-area>.wide{display:block !important}`;
  document.head.appendChild(s);
  window.addEventListener('DOMContentLoaded',()=>{
    const open=target=>{document.body.classList.add('vidik-details-open');target?.scrollIntoView({behavior:'smooth',block:'start'});};
    document.getElementById('seeAnalysis')?.addEventListener('click',e=>{e.preventDefault();open(document.getElementById('analysis'));});
    document.getElementById('compareOptions')?.addEventListener('click',e=>{e.preventDefault();open(document.getElementById('analysis'));});
    document.getElementById('challengeDecision')?.addEventListener('click',e=>{e.preventDefault();open(document.querySelector('.challenge'));});
    document.addEventListener('click',e=>{if(e.target.closest('.evidence-details'))open(document.getElementById('analysis'));});
  });
})();

(function(){
  const load=(src)=>{const s=document.createElement('script');s.src=src;document.head.appendChild(s);return s;};
  load('./js/intervention-universe.js?v=20260911-universe-4');
  load('./js/municipal-universe-evidence.js?v=20260911-universe-2');
  load('./js/municipal-universe-ui.js?v=20260911-universe-4');
  load('./js/decision-intelligence-9.7-browser.js?v=20260911-di97');
  load('./js/municipal-universe-governance.js?v=20260911-universe-1');
})();
