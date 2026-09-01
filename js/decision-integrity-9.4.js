'use strict';

// V9.4 decision-integrity layer: turns the existing ranking result into an
// explicit, auditable decision object without replacing the hardened engine.
(function(){
  const baseRender=window.render;
  if(typeof baseRender!=='function') return;

  function buildDecisionIntegrity(){
    const city=document.getElementById('city')?.value||'';
    const pool=Number(document.getElementById('pool')?.value);
    const risk=Number(document.getElementById('risk')?.value);
    const scored=C.map(score);
    const admissible=scored.filter(x=>!x.blocked&&C.find(c=>c.id===x.id).risk<=risk).sort((a,b)=>b.score-a.score);
    const rows=admissible.map(x=>{const c=C.find(y=>y.id===x.id);return {id:x.id,name:x.name,score:x.score,min:c.min,max:c.max}});
    const allocation=allocate(pool,rows);
    const auditEl=document.getElementById('audit');
    let prior={};
    try{prior=JSON.parse(auditEl?.textContent||'{}')}catch{}
    const decision={
      schema:'VIDIK.DecisionObject.v9.4',
      objective:V.objective?.id||null,
      city:{name:city,country:cityCountry(city),id:prior.city_id||null},
      resources:{unit:'CAD',pool},
      baseline:{id:'status-quo',allocation:{},score:0},
      alternatives:scored.map(x=>({id:x.id,name:x.name,admissible:!x.blocked&&C.find(c=>c.id===x.id).risk<=risk,score:x.score,gate:x.gate})),
      recommendation:admissible[0]?.id||null,
      allocation:{status:allocation.conserved?'complete':'blocked',allocations:allocation.allocations||{},conserved:!!allocation.conserved,reason:allocation.reason||null},
      uncertainty:{preserved:true},
      evidence:{records:Object.keys(E).length,verified:Object.values(E).filter(e=>e.status==='verified').length},
      learning:{checkpoints:['6-month','1-year','2-year','5-year']},
      provenance:{snapshot_version:prior.decision_snapshot_version||null,captured_at:prior.timestamp||null}
    };
    window.VIDIK_DECISION_9_4=decision;
    if(auditEl) auditEl.textContent=JSON.stringify({...prior,decision_object:decision},null,2);
    const frontier=document.getElementById('frontier');
    if(frontier){
      frontier.textContent='Allocation: '+(allocation.conserved?'COMPLETE':'BLOCKED — '+(allocation.reason||'validated capacity cannot cover the requested pool'))+' | '+JSON.stringify(allocation.allocations||{});
    }
  }

  window.render=function(){baseRender();buildDecisionIntegrity()};
  window.buildDecisionIntegrity=buildDecisionIntegrity;
})();
