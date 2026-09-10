'use strict';
const V={version:'9.2.0',city:'Ottawa',currency:'CAD',objective:{id:'verified-outcome-improvement',unit:'candidate-specific verified outcome metric',comparability:'required'},weights:{need:.18,effect:.32,capacity:.14,feasibility:.14,equity:.10,risk:.12}};

// Advanced governance/lifecycle panels stay collapsed, but remain user-openable on the product surface.
(function(){
  const s=document.createElement('style');
  s.textContent=`
    .analysis-area>details.advanced.card{display:block !important}
    body.vidik-details-open .analysis-tabs{display:flex !important}
    body.vidik-details-open .analysis-area>.analysis-heading{display:block !important}
    body.vidik-details-open .analysis-area>.card{display:block !important}
    body.vidik-details-open .analysis-area>.wide{display:block !important}
  `;
  document.head.appendChild(s);
  window.addEventListener('DOMContentLoaded',()=>{
    const open=target=>{document.body.classList.add('vidik-details-open');target?.scrollIntoView({behavior:'smooth',block:'start'});};
    document.getElementById('seeAnalysis')?.addEventListener('click',e=>{e.preventDefault();open(document.getElementById('analysis'));});
    document.getElementById('compareOptions')?.addEventListener('click',e=>{e.preventDefault();open(document.getElementById('optionsSection'));});
    document.getElementById('challengeDecision')?.addEventListener('click',e=>{e.preventDefault();open(document.querySelector('.challenge'));});
    document.addEventListener('click',e=>{if(e.target.closest('.evidence-details'))open(document.getElementById('analysis'));});
  });
})();

// Load the jurisdiction-portable municipal intervention universe, evidence map and product bridge.
(function(){const s=document.createElement('script');s.src='./js/intervention-universe.js?v=20260910-universe-3';document.head.appendChild(s);const e=document.createElement('script');e.src='./js/municipal-universe-evidence.js?v=20260910-universe-1';document.head.appendChild(e);const u=document.createElement('script');u.src='./js/municipal-universe-ui.js?v=20260910-universe-3';document.head.appendChild(u);const d=document.createElement('script');d.src='./js/decision-intelligence-9.7-browser.js?v=20260910-di97';document.head.appendChild(d)})();
