'use strict';
(function(){
 function renderUniverse(){
  if(typeof VIDIK_INTERVENTION_UNIVERSE==='undefined')return setTimeout(renderUniverse,50);
  const input=document.getElementById('decisionProblem');if(!input)return;
  const p=input.value||'',matches=vidikUniverseForProblem(p),box=document.getElementById('answerFirst');
  if(!box||!p.trim()||!matches.length)return;
  const ev=matches.flatMap(m=>VIDIK_INTERVENTION_UNIVERSE.evidence[m.domain]||[]),unique=[...new Map(ev.map(x=>[x.name,x])).values()];
  box.querySelector('.universe-panel')?.remove();
  const panel=document.createElement('div');panel.className='answer-action universe-panel';
  const domainText=matches.map(m=>m.name).join(' · '),classes=matches.flatMap(m=>m.classes).filter((x,i,a)=>a.indexOf(x)===i);
  panel.innerHTML='<strong>Intervention universe identified</strong><div class="answer-muted">VIDIK is considering relevant municipal approaches for <b>'+hEsc(p)+'</b>, rather than selecting from a predetermined recommendation.</div><div class="answer-muted" style="margin-top:8px"><b>Domain:</b> '+hEsc(domainText)+'</div><div class="answer-muted" style="margin-top:6px"><b>Potential option classes:</b> '+hEsc(classes.join(' · '))+'</div>'+(unique.length?'<div style="margin-top:10px"><b>Evidence currently identified</b><ul>'+unique.map(x=>'<li><a href="'+hEsc(x.url)+'" target="_blank" rel="noopener">'+hEsc(x.name)+'</a> — '+hEsc(x.tier)+'. '+hEsc(x.note)+'</li>').join('')+'</ul></div>':'')+'<div class="answer-muted" style="margin-top:8px">Evidence discovery does not make an option admissible. VIDIK still requires jurisdiction-specific parameterization, transportability, outcome comparability, implementation constraints and causal gates before optimization.</div>';
  box.appendChild(panel);
 }
 function wire(){renderUniverse();document.getElementById('decisionProblem')?.addEventListener('input',renderUniverse)}
 document.addEventListener('DOMContentLoaded',()=>setTimeout(wire,100));
})();
