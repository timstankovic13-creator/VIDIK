'use strict';
(function(){
 const labels={
  municipal:['CIVIC DECISION','What decision should your city make?','A clear path from public problem to defensible action.'],
  business:['BUSINESS DECISION','What decision moves the business forward?','Compare resources, risk, evidence and consequence in one place.'],
  community:['COMMUNITY DECISION','What change would make the biggest difference?','Keep people, reach, equity and practical delivery in view.'],
  research:['RESEARCH DECISION','What do you need to decide or test?','Separate evidence, uncertainty and competing explanations.'],
  enterprise:['ENTERPRISE DECISION','What consequential decision needs to be made?','Make alternatives, dependencies, risk and trade-offs visible.']
 };
 function kind(){return document.getElementById('audienceSelect')?.value||'municipal'}
 function apply(){
  const d=labels[kind()]||labels.municipal;
  document.body.dataset.workspace=kind();
  const e=document.querySelector('.hero-copy>.eyebrow'),h=document.querySelector('.hero-copy h1'),p=document.querySelector('.hero-copy p');
  if(e)e.textContent=d[0];
  if(h)h.textContent=d[1];
  if(p)p.textContent=d[2];
 }
 function init(){
  apply();
  document.getElementById('audienceSelect')?.addEventListener('change',apply);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
