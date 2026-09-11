'use strict';
(function(){
 function esc(x){return String(x??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
 function renderUniverse(){
  if(typeof VIDIK_INTERVENTION_UNIVERSE==='undefined'||typeof VIDIK_UNIVERSE_EVIDENCE==='undefined')return setTimeout(renderUniverse,50);
  const input=document.getElementById('decisionProblem');if(!input)return;
  const p=input.value||'',matches=vidikUniverseForProblem(p),box=document.getElementById('answerFirst')||document.querySelector('.problem-principle');
  if(!box||!p.trim()||!matches.length)return;
  const items=typeof vidikUniverseItemsForProblem==='function'?vidikUniverseItemsForProblem(p):matches.flatMap(m=>m.items||[]);
  const ev=matches.flatMap(m=>(VIDIK_UNIVERSE_EVIDENCE[m.domain]||[])),unique=[...new Map(ev.map(x=>[x.name,x])).values()];
  const panel=document.getElementById('vidik-universe-panel')||document.createElement('div');panel.id='vidik-universe-panel';panel.className='answer-action universe-panel';
  const domainText=matches.map(m=>m.name).join(' · '),authority=[...new Set(items.map(x=>x.authority))].join(' · '),funding=[...new Set(items.flatMap(x=>x.funding))].join(' · ');
  let coverage=typeof vidikUniverseCoverage==='function'?vidikUniverseCoverage(p,[]):null,verified=[];
  try{if(window.VIDIK_PLATFORM_10?.listVerifiedMunicipalInterventions){verified=window.VIDIK_PLATFORM_10.listVerifiedMunicipalInterventions(p).map(x=>x.universeId);coverage=vidikUniverseCoverage(p,verified)}}catch(_){/* keep discovery-only coverage */}
  const unresolved=coverage?.unresolved?.length||0;
  panel.innerHTML='<strong>Intervention universe discovered</strong><div class="answer-muted">VIDIK discovered <b>'+items.length+'</b> candidate interventions across '+matches.length+' relevant domain(s) <b>before optimization</b>.</div><div class="answer-muted" style="margin-top:8px"><b>Domains:</b> '+esc(domainText)+'</div><div class="answer-muted" style="margin-top:6px"><b>Authority:</b> '+esc(authority)+'</div><div class="answer-muted" style="margin-top:6px"><b>Funding types:</b> '+esc(funding)+'</div><div class="answer-muted" style="margin-top:8px"><b>Verified decision-set coverage:</b> '+(coverage?Math.round(coverage.coverageRatio*100):0)+'% ('+verified.length+'/'+items.length+') — '+(coverage&&coverage.complete?'READY FOR OPTIMIZATION':'BLOCKED UNTIL MATERIAL OPTIONS ARE VERIFIED')+'</div><div class="answer-muted" style="margin-top:6px"><b>Unresolved candidates:</b> '+unresolved+'</div>'+(unique.length?'<div style="margin-top:10px"><b>Evidence currently identified (not automatically treated as verified)</b><ul>'+unique.map(x=>'<li><a href="'+esc(x.url)+'" target="_blank" rel="noopener">'+esc(x.name)+'</a> — '+esc(x.tier)+'. '+esc(x.note)+'</li>').join('')+'</ul></div>':'')+'<div class="answer-muted" style="margin-top:8px">Unknown is not treated as zero. Discovery, evidence identification, municipal authority, cost/capacity/effect verification and optimization are separate gates. Status quo and opportunity cost remain explicit.</div>';
  if(!panel.parentNode)box.appendChild(panel);
 }
 function wire(){renderUniverse();document.getElementById('decisionProblem')?.addEventListener('input',renderUniverse)}
 document.addEventListener('DOMContentLoaded',()=>setTimeout(wire,100));
})();
