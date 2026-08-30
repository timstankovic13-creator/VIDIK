'use strict';
(function(){
  const DI=window.VIDIK_DECISION_INTELLIGENCE_92;
  if(!DI) throw new Error('VIDIK 9.2 intelligence unavailable');
  const state=window.VIDIK_92_INTEGRATION={version:DI.version,status:'INITIALIZING',decision:null,lineage:null,sensitivity:null,voi:null,counterfactual:null,lastEvidenceHash:null,lastOutcome:null};
  function claimsForEvidence(){const claims=[];for(const e of Object.values(E)){(e.claims||[]).forEach((c,i)=>claims.push({id:e.id+':claim:'+i,evidenceIds:[e.id],type:c.type,text:c.text}));}return claims;}
  function paramsForCandidate(c){const out=[];for(const [key,p] of Object.entries(c.params||{})){if(!p)continue;const claimIds=(p.evidenceIds||[]).map(id=>id+':claim:0');out.push({id:c.id+':'+key,claimIds,value:p.value,unit:p.unit,derivation:p.derivation});}return out;}
  async function recompute(){
    const claims=claimsForEvidence(),parameters=C.flatMap(paramsForCandidate),scored=C.map(score),admissible=scored.filter(x=>!x.blocked&&x.risk<=Number(document.getElementById('risk').value||0));
    const top=admissible.sort((a,b)=>b.score-a.score)[0]||null;
    const topCandidate=top&&C.find(c=>c.id===top.id);
    const lineage=await DI.buildLineage({evidence:Object.values(E),claims,parameters,recommendation:topCandidate?{parameterIds:paramsForCandidate(topCandidate).map(p=>p.id)}:null});
    const params=topCandidate?Object.values(topCandidate.params).filter(Boolean).map(p=>({id:topCandidate.id,low:p.uncertainty?.low,high:p.uncertainty?.high,mean:p.value})).filter(p=>Number.isFinite(p.low)&&Number.isFinite(p.high)&&Number.isFinite(p.mean)):[];
    const sensitivity=DI.sensitivityFlip({baseline:{risk:Number(document.getElementById('risk').value||0)},parameters:[{id:'risk',low:0,high:1}],scoreFn:x=>{const rows=C.map(score).filter(r=>!r.blocked&&C.find(c=>c.id===r.id).risk<=x.risk).sort((a,b)=>b.score-a.score);return {recommendation:rows[0]?.id||null};}});
    const voi=DI.valueOfInformation({currentDecision:top?.score??0,decisionValue:1,evidenceCost:0,candidates:scored.filter(x=>x.blocked).map(x=>({id:x.id,expectedBestValue:0,cost:0}))});
    const counterfactual=top?DI.counterfactual({statusQuo:{value:0},recommendation:{value:top.score},metricFn:x=>x.value}):null;
    state.status='READY';state.decision={recommendation:top?.id||null,score:top?.score??null,admissible:admissible.map(x=>x.id)};state.lineage=lineage;state.sensitivity=sensitivity;state.voi=voi;state.counterfactual=counterfactual;state.lastEvidenceHash=lineage.hash;return state;
  }
  state.recompute=recompute;
  const originalRender=window.render;
  window.render=function(){const r=originalRender();recompute().catch(e=>{state.status='BLOCKED';state.error=e.message;});return r;};
  window.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>recompute().catch(e=>{state.status='BLOCKED';state.error=e.message;}),0);});
})();
