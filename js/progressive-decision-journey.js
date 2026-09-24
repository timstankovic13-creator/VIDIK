'use strict';
(function(){
 const steps=[
  ['Understanding your decision','Defining the objective, place, resources and baseline.'],
  ['Finding possible interventions','Searching beyond VIDIK’s hand-picked examples.'],
  ['Checking the evidence','Separating evidence from discovery leads and unknowns.'],
  ['Testing uncertainty','Finding what could change the decision.'],
  ['Building the decision','Assembling the governed decision record.']
 ];
 function inject(){
  if(document.getElementById('vidikJourney')) return;
  const host=document.createElement('section');host.id='vidikJourney';host.className='journey-screen';host.setAttribute('aria-live','polite');
  host.innerHTML='<div class="journey-inner"><span class="journey-kicker">VIDIK IS WORKING THROUGH THE DECISION</span><h1 class="journey-title">Not a dashboard.<br> A decision, being built.</h1><p class="journey-subtitle">The intelligence stays the same. VIDIK is now showing you how the decision is constructed.</p><div class="journey-steps">'+steps.map((s,i)=>'<div class="journey-step" data-journey-step="'+i+'"><span class="num">'+(i+1)+'</span><strong>'+s[0]+'</strong><span>'+s[1]+'</span></div>').join('')+'</div></div>';
  document.getElementById('top')?.insertBefore(host,document.getElementById('decision'));
 }
 function state(s){document.body.dataset.journeyState=s}
 function run(){
  const input=document.getElementById('decisionProblem');if(!input?.value.trim()) return;
  inject();state('processing');
  const nodes=[...document.querySelectorAll('.journey-step')];
  nodes.forEach((n,i)=>{setTimeout(()=>{nodes.forEach(x=>x.classList.remove('active'));n.classList.add('active');if(i)nodes[i-1].classList.add('done')},i*620)});
  setTimeout(()=>{nodes.forEach(n=>{n.classList.remove('active');n.classList.add('done')});state('decision');document.getElementById('answerFirst')?.scrollIntoView({behavior:'smooth',block:'start'});},steps.length*620+350);
 }
 function bind(){
  inject();
  if(document.body.dataset.journeyBound==='1')return;
  document.body.dataset.journeyBound='1';
  document.body.dataset.journeyState='ask';
  document.getElementById('runDecision')?.addEventListener('click',run);
  document.querySelectorAll('.example-chip').forEach(c=>c.addEventListener('click',()=>state('ask')));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
 window.VIDIKDecisionJourney={run,state};
})();
