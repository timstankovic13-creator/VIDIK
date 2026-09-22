'use strict';
(function(){
  const baseRender=window.render;
  if(typeof baseRender!=='function') return;
  function buildDecisionIntegrity(){
    const city=document.getElementById('city')?.value||'',pool=Number(document.getElementById('pool')?.value),risk=Number(document.getElementById('risk')?.value),scored=C.map(score);
    const priorDecision=window.VIDIK_DECISION_9_4||{};
    const admissible=scored.filter(x=>!x.blocked&&C.find(c=>c.id===x.id).risk<=risk).sort((a,b)=>b.score-a.score),rows=admissible.map(x=>{const c=C.find(y=>y.id===x.id);return {id:x.id,name:x.name,score:x.score,min:c.min,max:c.max}}),allocation=allocate(pool,rows),auditEl=document.getElementById('audit');
    let prior={};try{prior=JSON.parse(auditEl?.textContent||'{}')}catch{}
    const decision={schema:'VIDIK.DecisionObject.v9.4',objective:V.objective?.id||null,city:{name:city,country:cityCountry(city),id:prior.city_id||null},resources:{unit:'CAD',pool},baseline:{id:'status-quo',allocation:{},score:0},alternatives:scored.map(x=>({id:x.id,name:x.name,admissible:!x.blocked&&C.find(c=>c.id===x.id).risk<=risk,score:x.score,gate:x.gate})),recommendation:admissible[0]?.id||null,allocation:{status:allocation.conserved?'complete':'blocked',allocations:allocation.allocations||{},conserved:!!allocation.conserved,reason:allocation.reason||null},uncertainty:{preserved:true},evidence:{records:Object.keys(E).length,verified:Object.values(E).filter(e=>e.status==='verified').length},learning:{checkpoints:['6-month','1-year','2-year','5-year']},provenance:{snapshot_version:prior.decision_snapshot_version||null,captured_at:prior.timestamp||null},municipalEvidence:priorDecision.municipalEvidence,municipalOutcomePlan:priorDecision.municipalOutcomePlan};
    window.VIDIK_DECISION_9_4=decision;
    if(auditEl)auditEl.textContent=JSON.stringify({...prior,decision_object:decision},null,2);
    const frontier=document.getElementById('frontier');if(frontier)frontier.textContent='Allocation: '+(allocation.conserved?'COMPLETE':'BLOCKED — '+(allocation.reason||'validated capacity cannot cover the requested pool'))+' | '+JSON.stringify(allocation.allocations||{});
    return decision;
  }
  let syncing=false;
  function syncFromIntegration(){
    const s=window.VIDIK_92_INTEGRATION;if(!s||s.status!=='READY'||!s.decision)return false;
    // Rebuild from the current controls before merging integration-only fields. This prevents
    // a delayed integration sync from resurrecting allocations from an older decision revision.
    // Preserve lifecycle attachments added after the last render; these are part of the
    // decision object and must survive the scheduled integrity refresh.
    const current=buildDecisionIntegrity()||window.VIDIK_DECISION_9_4||{};
    const pool=Number(document.getElementById('pool')?.value);
    const decision=Object.assign({},current,{schema:'VIDIK.DecisionObject.v9.4',objective:current.objective||V.objective?.id||null,city:Object.assign({},current.city||{},{name:s.decision.city}),resources:{unit:'CAD',pool},recommendation:s.decision.recommendation,score:s.decision.score,alternatives:(current.alternatives||[]).map(a=>Object.assign({},a,{admissible:s.decision.admissible.includes(a.id)})),lineage:s.lineage||null,sourceLineage:s.sourceLineage||null,decisionContextStatus:s.decisionContextStatus,decisionContext:{status:s.decisionContextStatus,context:s.decisionContext},sensitivity:s.sensitivity||null,voi:s.voi||null,counterfactual:s.counterfactual||null,provenance:Object.assign({},current.provenance||{},{evidence_hash:s.lastEvidenceHash||null,revision:s.revision}),runtimeStatus:s.status});
    window.VIDIK_DECISION_9_4=decision;
    const auditEl=document.getElementById('audit');if(auditEl && !syncing){syncing=true;auditEl.textContent=JSON.stringify({decision_object:decision,sourceLineage:s.sourceLineage,decisionContext:{status:s.decisionContextStatus,context:s.decisionContext},lineageHash:s.lastEvidenceHash,counterfactual:s.counterfactual},null,2);syncing=false;}
    return true;
  }
  function scheduleSync(){[0,25,75,150,300,600].forEach(ms=>setTimeout(syncFromIntegration,ms));}
  window.buildDecisionIntegrity=buildDecisionIntegrity;
  window.render=function(){baseRender();buildDecisionIntegrity();scheduleSync()};
  window.addEventListener('DOMContentLoaded',()=>{scheduleSync();['city','pool','risk'].forEach(id=>document.getElementById(id)?.addEventListener('input',()=>{buildDecisionIntegrity();scheduleSync()}));});
})();
