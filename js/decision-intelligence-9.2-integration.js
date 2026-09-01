'use strict';
(function(){
  const DI=window.VIDIK_DECISION_INTELLIGENCE_92;
  if(!DI) throw new Error('VIDIK 9.2 intelligence unavailable');
  const state=window.VIDIK_92_INTEGRATION={version:DI.version,status:'INITIALIZING',decision:null,lineage:null,sourceLineage:null,decisionContext:null,decisionContextStatus:'BLOCKED',sensitivity:null,voi:null,counterfactual:null,lastEvidenceHash:null,lastOutcome:null,revision:0};
  const qualityWeight=q=>({high:1,medium:.7,low:.4}[String(q||'').toLowerCase()]??0);
  function claimsForEvidence(){const claims=[];for(const e of Object.values(E))(e.claims||[]).forEach((c,i)=>claims.push({id:e.id+':claim:'+i,evidenceIds:[e.id],type:c.type,text:c.text}));return claims;}
  function paramsForCandidate(c){const out=[];for(const [key,p] of Object.entries(c.params||{})){if(!p)continue;const claimIds=(p.evidenceIds||[]).map(id=>id+':claim:0');out.push({id:c.id+':'+key,claimIds,value:p.value,unit:p.unit,derivation:p.derivation,uncertainty:p.uncertainty});}return out;}
  function numericControl(id){const el=document.getElementById(id);const raw=el?.value?.trim();const value=Number(raw);if(raw!==''&&Number.isFinite(value))return value;const fallback=Number(el?.defaultValue);return Number.isFinite(fallback)?fallback:null;}
  function evidenceForCandidate(c){return [...new Set((c.evidence||[]).map(id=>E[id]).filter(Boolean))];}
  function evidenceStrength(c){const es=evidenceForCandidate(c);if(!es.length)return 0;return es.reduce((s,e)=>s+qualityWeight(e.quality)*Number(e.transportability||0),0)/es.length;}
  function scoreWithEffect(c,effectValue){const p=c.params;return V.weights.need*p.need.value+V.weights.effect*effectValue+V.weights.capacity*p.capacity.value+V.weights.feasibility*p.feasibility.value+V.weights.equity*p.equity.value+V.weights.risk*(1-c.risk);}
  function sourceLineageForCity(city){const A=window.VIDIK_CITY_SOURCE_ADAPTERS;if(!A)return {status:'BLOCKED',reason:'city-source-contracts-unavailable'};const s=A.get(city);return {status:'CONTRACTED',city:s.city,provider:s.provider,sourceType:s.sourceType,sourceUrl:s.sourceUrl,retrievalMode:s.retrievalMode,identityAuthority:s.identityAuthority,populationEnrichment:s.populationEnrichment};}
  function resolveDecisionContext(city){
    const C=window.VIDIK_MUNICIPAL_DECISION_CONTEXT;
    if(!C)return {status:'BLOCKED',reason:'municipal-context-adapter-boundary-unavailable',context:null};
    const supplied=window.VIDIK_MUNICIPAL_RECONCILIATIONS;
    const reconciliation=supplied&&typeof supplied==='object'?supplied[city]:null;
    if(!reconciliation)return {status:'BLOCKED',reason:'municipal-context-reconciliation-unavailable',context:null};
    try{return {status:'READY',reason:null,context:C.resolve(city,reconciliation)};}
    catch(e){return {status:'BLOCKED',reason:e.message,context:null};}
  }
  function renderDecisionOutputs(city,topCandidate,admissible){
    const why=document.getElementById('why'),uncertainty=document.getElementById('uncertainty'),voi=document.getElementById('voi'),audit=document.getElementById('audit');
    if(why)why.textContent=topCandidate?`Why: ${topCandidate.name} is the highest-scoring admissible intervention for ${city}. Why-not: alternatives are lower-scoring or blocked by evidence/constraints.`:'Why: no candidate clears the evidence and risk gates.';
    if(uncertainty)uncertainty.textContent=state.sensitivity?`Sensitivity: ${JSON.stringify(state.sensitivity)}. Parameter uncertainty remains attached to the evidence-linked inputs.`:'Sensitivity analysis pending.';
    if(voi)voi.textContent=state.voi?`VOI: ${JSON.stringify(state.voi)}. Prioritize evidence that could change the recommendation or unblock an excluded candidate.`:'VOI analysis pending.';
    if(audit)audit.textContent=JSON.stringify({version:state.version,revision:state.revision,city,decision:state.decision,decision_object:window.VIDIK_DECISION_9_4||null,sourceLineage:state.sourceLineage,decisionContext:{status:state.decisionContextStatus,context:state.decisionContext},lineageHash:state.lastEvidenceHash,counterfactual:state.counterfactual},null,2);
  }
  async function recompute(){
    const revision=++state.revision;
    const claims=claimsForEvidence(),parameters=C.flatMap(paramsForCandidate),scored=C.map(score),risk=numericControl('risk'),city=document.getElementById('city')?.value?.trim()||'';
    if(!Number.isFinite(risk)||risk<0||risk>1)throw new Error('invalid-risk-ceiling');
    const admissible=scored.filter(x=>!x.blocked&&C.find(c=>c.id===x.id)?.risk<=risk).sort((a,b)=>b.score-a.score);
    const renderedName=document.getElementById('rec')?.textContent?.trim()||'',renderedCandidate=C.find(c=>c.name===renderedName),top=renderedCandidate?admissible.find(x=>x.id===renderedCandidate.id)||null:(admissible[0]||null),topCandidate=top&&C.find(c=>c.id===top.id);
    const candidateParameters=topCandidate?paramsForCandidate(topCandidate):[],linkedParameters=candidateParameters.filter(p=>p.claimIds?.length),lineage=await DI.buildLineage({evidence:Object.values(E),claims,parameters,recommendation:topCandidate?{parameterIds:linkedParameters.map(p=>p.id)}:null});
    if(revision!==state.revision)return state;
    if(topCandidate&&linkedParameters.length){const existing=new Set(lineage.links.map(l=>String(l.parameterId)+'|'+String(l.claimId)+'|'+String(l.evidenceId)));for(const p of linkedParameters)for(const cid of p.claimIds||[])for(const eid of claims.find(c=>c.id===cid)?.evidenceIds||[]){const key=p.id+'|'+cid+'|'+eid;if(!existing.has(key)){lineage.links.push({evidenceId:eid,claimId:cid,parameterId:p.id});existing.add(key);}}lineage.hash=await DI.hashObject({links:lineage.links,evidence:Object.values(E).map(e=>({id:e.id,sourceType:e.sourceType,url:e.url,retrievedAt:e.retrievedAt,status:e.status,transportability:e.transportability,claims:e.claims,notes:e.notes||'',direction:e.direction||null,quality:e.quality??null}))});}
    if(revision!==state.revision)return state;
    if(topCandidate&&linkedParameters.length&&!lineage.links.some(l=>linkedParameters.some(p=>p.id===l.parameterId)))throw new Error('recommendation-lineage-missing:'+topCandidate.id);
    const sensitivity=DI.sensitivityFlip({baseline:{risk},parameters:[{id:'risk',low:0,high:1}],scoreFn:x=>{const rows=C.map(score).filter(r=>!r.blocked&&C.find(c=>c.id===r.id).risk<=x.risk).sort((a,b)=>b.score-a.score);return {recommendation:rows[0]?.id||null};}});
    const voiCandidates=C.filter(c=>c.id!==topCandidate?.id).map(c=>{const es=evidenceForCandidate(c),strength=evidenceStrength(c),p=c.params?.effect,upper=p?.uncertainty?.high;const supportedUpper=Number.isFinite(upper)&&p?.evidenceIds?.length?scoreWithEffect(c,upper):null;const expectedBestValue=Number.isFinite(supportedUpper)?supportedUpper:0;const cost=es.length?es.reduce((s,e)=>s+(1-qualityWeight(e.quality))*Number(e.transportability||0),0)/es.length:1;return {id:c.id,expectedBestValue,cost,evidenceIds:es.map(e=>e.id),evidenceStrength:strength};});
    const voi=DI.valueOfInformation({currentDecision:top?.score??0,decisionValue:1,evidenceCost:0,candidates:voiCandidates});
    let counterfactual=null;if(topCandidate){const effect=topCandidate.params.effect?.value;if(Number.isFinite(effect)&&topCandidate.params.effect.evidenceIds?.length){const statusQuoScore=scoreWithEffect(topCandidate,0),recommendationScore=scoreWithEffect(topCandidate,effect);counterfactual={statusQuo:{score:statusQuoScore,evidenceIds:topCandidate.params.effect.evidenceIds},recommendation:{score:recommendationScore,evidenceIds:topCandidate.params.effect.evidenceIds},incremental:recommendationScore-statusQuoScore,improves:recommendationScore>statusQuoScore,semantics:'evidence-linked effect set to zero for status quo; observed/causal effect retained for recommendation'};}}
    state.status='READY';state.decision={recommendation:top?.id||null,score:top?.score??null,admissible:admissible.map(x=>x.id),city};state.sourceLineage=sourceLineageForCity(city);const ctx=resolveDecisionContext(city);state.decisionContextStatus=ctx.status;state.decisionContext=ctx.context;state.lineage=lineage;state.sensitivity=sensitivity;state.voi=voi;state.counterfactual=counterfactual;state.lastEvidenceHash=lineage.hash;state.lastOutcome=state.lastOutcome;renderDecisionOutputs(city,topCandidate,admissible);return state;
  }
  state.recompute=recompute;
  const originalRender=window.render;
  window.render=function(){const r=originalRender();recompute().catch(e=>{state.status='BLOCKED';state.error=e.message;});return r;};
  window.addEventListener('DOMContentLoaded',()=>setTimeout(()=>recompute().catch(e=>{state.status='BLOCKED';state.error=e.message;}),0));
})();
