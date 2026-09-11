'use strict';
(function(w){
  const profiles={
    municipal:{label:'Municipal',scope:'Public-sector resource allocation and service decisions',decisionTypes:['service allocation','program prioritization','public-safety intervention','housing intervention','health intervention','environmental intervention'],required:['statusQuo','interventionUniverse','evidence','uncertainty','opportunityCost','equity','implementationConstraints']},
    business:{label:'Business / Enterprise',scope:'Evidence-constrained operating, investment, procurement, and portfolio decisions',decisionTypes:['capital allocation','procurement','operations','market expansion','risk mitigation','portfolio selection'],required:['statusQuo','options','evidence','uncertainty','opportunityCost','implementationConstraints']},
    developer:{label:'Developer / Project',scope:'Property, infrastructure, construction, and place-based development decisions',decisionTypes:['site selection','project scope','phasing','infrastructure investment','development option comparison','community-impact mitigation'],required:['statusQuo','options','evidence','uncertainty','opportunityCost','equity','implementationConstraints']},
    research:{label:'Research / Analysis',scope:'Reproducible evidence, scenario, and counterfactual analysis',decisionTypes:['hypothesis comparison','program evaluation','scenario analysis','transferability assessment'],required:['options','evidence','uncertainty','provenance']},
    public:{label:'Public / Community',scope:'Transparent public-interest decisions and challengeable recommendations',decisionTypes:['community priority','public-benefit comparison','participatory option review'],required:['statusQuo','options','evidence','uncertainty','equity','provenance']}
  };
  const aliases={government:'municipal',enterprise:'business',development:'developer',property:'developer'};
  const profile=a=>profiles[aliases[a]||a]||null;
  const validate=(a,d)=>{const p=profile(a);if(!p)return {ok:false,code:'UNKNOWN_AUDIENCE'};const missing=p.required.filter(k=>d==null||d[k]==null);return {ok:missing.length===0,code:missing.length?'AUDIENCE_CONTRACT_INCOMPLETE':'AUDIENCE_CONTRACT_VALID',audience:aliases[a]||a,missing,profile:p};};
  const api={version:'1.1.0',profiles,aliases,getAudienceProfile:profile,listAudienceProfiles:()=>Object.keys(profiles),validateAudienceDecision:validate,developerIntegration:{apiStable:true,decisionObjectBoundary:'required',rawDataPassthrough:false,provenanceRequired:true,uncertaintyRequired:true,auditRequired:true}};
  w.VIDIK_AUDIENCE_CONTRACT_1=api;
  const P=w.VIDIK_PLATFORM_10;
  if(P){
    P.AUDIENCE_PROFILES=profiles;
    P.getAudienceProfile=profile;
    P.listAudienceProfiles=api.listAudienceProfiles;
    P.validateAudienceDecision=validate;
    if(Array.isArray(P.AUDIENCES)){for(const a of ['developer'])if(!P.AUDIENCES.includes(a))P.AUDIENCES.push(a);}
    if(P.createDecision&&!P.__audienceRuntime11){
      const originalCreate=P.createDecision, originalValidate=P.validateDecision, originalEvaluate=P.evaluate, originalScore=P.scoreIntegrity;
      const canonical=a=>aliases[a]||a;
      const nonMunicipalEnvelope=d=>{if(!Array.isArray(d.budgetOptions)||!d.budgetOptions.length)d.budgetOptions=[{id:'decision-envelope',label:'Decision resource envelope',type:'DECISION_ENVELOPE',amount:null,scope:'non-municipal',configurable:true}];return d;};
      P.createDecision=function(input={}){const requested=canonical(input.audience||'municipal');const internal={...input,audience:requested==='developer'?'business':requested};const d=originalCreate(internal);d.audience=requested;d.governance=d.governance||{};d.governance.audience=profile(requested);d.governance.decisionScope=profile(requested)?.scope||null;d.audit.push({event:'AUDIENCE_CONTEXT_BOUND',at:new Date().toISOString(),audience:requested});return d;};
      P.validateDecision=function(d){if(d&&d.audience&&d.audience!=='municipal'){const requested=d.audience;const internal={...d,audience:requested==='developer'?'business':canonical(requested)};return originalValidate(internal);}return originalValidate(d);};
      P.evaluate=function(d,fn){if(!d||d.audience==='municipal')return originalEvaluate(d,fn);const requested=d.audience;const originalAudience=requested;const hadBudget=Object.prototype.hasOwnProperty.call(d,'budgetOptions');const oldBudget=d.budgetOptions;d.audience=requested==='developer'?'business':canonical(requested);nonMunicipalEnvelope(d);const r=originalEvaluate(d,fn);d.audience=originalAudience;if(!hadBudget)delete d.budgetOptions;else d.budgetOptions=oldBudget;if(r&&r.decision)r.decision.audience=originalAudience;if(r&&r.integrity&&r.decision?.governance)r.decision.governance.audience=profile(originalAudience);if(r&&r.ok===true)r.recommendation=r.decision?.recommendation??null;return r;};
      P.scoreIntegrity=function(d){if(!d||d.audience==='municipal')return originalScore(d);const requested=d.audience,hadBudget=Object.prototype.hasOwnProperty.call(d,'budgetOptions'),oldBudget=d.budgetOptions;d.audience=requested==='developer'?'business':canonical(requested);nonMunicipalEnvelope(d);const r=originalScore(d);d.audience=requested;if(!hadBudget)delete d.budgetOptions;else d.budgetOptions=oldBudget;return r;};
      P.__audienceRuntime11=true;
    }
  }
  function injectDeveloperCard(){
    const grid=document.querySelector('.audience-grid');
    if(grid&&!grid.querySelector('[data-audience="developer"]')){const card=document.createElement('button');card.type='button';card.className='audience-card';card.dataset.audience='developer';card.setAttribute('role','tab');card.innerHTML='<span class="audience-icon">⌂+</span><b>Developer / Project</b><small>Sites, infrastructure & development</small>';grid.appendChild(card);}
  }
  function renderWorkspace(a){
    const host=document.getElementById('nonMunicipal');if(!host)return;
    const p=profile(a);if(!p)return;
    let panel=document.getElementById('audienceDecisionWorkspace');
    if(!panel){panel=document.createElement('section');panel.id='audienceDecisionWorkspace';panel.className='card';host.appendChild(panel);}
    panel.innerHTML='<div class="eyebrow">DECISION WORKSPACE</div><h3>'+p.label+'</h3><p>'+p.scope+'. VIDIK will not fabricate missing evidence.</p><div class="field"><label for="audienceProblem">Decision / problem</label><input id="audienceProblem" placeholder="Describe the decision you need to make"></div><div class="field"><label for="audienceStatusQuo">Status quo</label><input id="audienceStatusQuo" placeholder="What happens if nothing changes?"></div><div class="field"><label for="audienceOptions">Candidate options</label><textarea id="audienceOptions" rows="4" placeholder="One candidate option per line"></textarea></div><div class="controls"><div class="field"><label for="audienceEvidence">Evidence records available</label><input id="audienceEvidence" type="number" min="0" value="0"></div><div class="field"><label for="audienceUncertainty">Overall uncertainty</label><input id="audienceUncertainty" type="number" min="0" max="1" step=".01" value="1"></div></div><div class="learning-actions"><button type="button" id="audienceEvaluate">Evaluate decision</button><button type="button" id="audienceExport">Export decision artifact</button></div><div id="audienceDecisionStatus" class="status hold">Awaiting decision definition</div><div id="audienceDecisionWhy" class="muted">VIDIK will distinguish evidence-supported options from unresolved candidates and keep the status quo visible.</div>';
    const status=panel.querySelector('#audienceDecisionStatus'),why=panel.querySelector('#audienceDecisionWhy');
    panel.querySelector('#audienceEvaluate').onclick=()=>{try{
      const problem=panel.querySelector('#audienceProblem').value.trim(),sq=panel.querySelector('#audienceStatusQuo').value.trim(),raw=panel.querySelector('#audienceOptions').value.split('\n').map(x=>x.trim()).filter(Boolean),evCount=Number(panel.querySelector('#audienceEvidence').value),unc=Number(panel.querySelector('#audienceUncertainty').value);
      if(!problem||!sq||!raw.length){status.textContent='BLOCKED · problem, status quo and at least one candidate option are required';status.className='status fail';return;}
      const evidence=Array.from({length:Math.max(0,Math.min(100,evCount))},(_,i)=>({id:'USER-EVIDENCE-'+(i+1),status:'UNVERIFIED'}));
      const d=P.createDecision({audience:a,objective:problem,problem,statusQuo:{description:sq},options:raw.map((name,i)=>({id:'OPTION-'+(i+1),name,evidenceStatus:evidence.length?'EVIDENCE_REVIEW_REQUIRED':'BLOCKED',unknown:!evidence.length})),evidence,uncertainty:{overall:Math.max(0,Math.min(1,unc))},opportunityCost:{known:false,comparison:'Required before adoption'},equity:{assessed:a==='developer'||a==='public'?false:true},constraints:{implementation:[]},provenance:evidence.map(e=>({id:e.id}))});
      const r=P.evaluate(d,(_,opts)=>({ranked:opts,recommended:opts.find(o=>o.evidenceStatus==='VERIFIED')||null}));
      if(!r.ok){status.textContent='BLOCKED · '+r.code;status.className='status fail';why.textContent=r.message||'Decision remains blocked until the evidence contract is satisfied.';return;}
      status.textContent=r.recommendation?'RECOMMENDATION · '+r.recommendation.name:'ANALYSIS COMPLETE · no verified recommendation';status.className='status '+(r.recommendation?'pass':'hold');why.textContent='Decision analyzed for '+p.label+'. Missing or unverified evidence is not converted into a recommendation.';
      panel.dataset.decisionId=d.id;panel.__decision=d;
    }catch(e){status.textContent='BLOCKED · '+e.message;status.className='status fail';}};
    panel.querySelector('#audienceExport').onclick=()=>{const d=panel.__decision;if(!d){status.textContent='BLOCKED · evaluate a decision first';status.className='status fail';return;}const blob=new Blob([P.exportArtifact(d)],{type:'application/json'}),u=URL.createObjectURL(blob),aEl=document.createElement('a');aEl.href=u;aEl.download='vidik-'+a+'-decision-'+d.id+'.json';aEl.click();URL.revokeObjectURL(u);status.textContent='ARTIFACT EXPORTED · auditable decision object preserved';status.className='status pass';};
  }
  if(typeof document!=='undefined'&&document.addEventListener){document.addEventListener('DOMContentLoaded',()=>{
    injectDeveloperCard();
    document.querySelectorAll('[data-audience]').forEach(x=>x.addEventListener('click',()=>{if(x.dataset.audience!=='municipal')renderWorkspace(x.dataset.audience);}));
    document.addEventListener('click',e=>{const card=e.target.closest('[data-audience="developer"],[data-audience="business"]');if(!card)return;setTimeout(()=>renderWorkspace(card.dataset.audience),0);},{capture:true});
  });}
})(window);
