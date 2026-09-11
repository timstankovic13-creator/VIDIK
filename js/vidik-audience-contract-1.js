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
  function profile(a){return profiles[aliases[a]||a]||null;}
  function validate(a,d){const p=profile(a);if(!p)return {ok:false,code:'UNKNOWN_AUDIENCE'};const missing=p.required.filter(k=>d==null||d[k]==null);return {ok:missing.length===0,code:missing.length?'AUDIENCE_CONTRACT_INCOMPLETE':'AUDIENCE_CONTRACT_VALID',audience:aliases[a]||a,missing,profile:p};}
  const api={version:'1.0.0',profiles,aliases,getAudienceProfile:profile,listAudienceProfiles:()=>Object.keys(profiles),validateAudienceDecision:validate,developerIntegration:{apiStable:true,decisionObjectBoundary:'required',rawDataPassthrough:false,provenanceRequired:true,uncertaintyRequired:true,auditRequired:true}};
  w.VIDIK_AUDIENCE_CONTRACT_1=api;
  const P=w.VIDIK_PLATFORM_10;
  if(P){P.AUDIENCE_PROFILES=profiles;P.getAudienceProfile=profile;P.listAudienceProfiles=api.listAudienceProfiles;P.validateAudienceDecision=validate;if(Array.isArray(P.AUDIENCES)&&!P.AUDIENCES.includes('developer'))P.AUDIENCES.push('developer');}
  if(typeof document!=='undefined'&&document.addEventListener){document.addEventListener('DOMContentLoaded',()=>{
    const grid=document.querySelector('.audience-grid');
    if(grid&&!grid.querySelector('[data-audience="developer"]')){const card=document.createElement('button');card.type='button';card.className='audience-card';card.dataset.audience='developer';card.innerHTML='<strong>Developer / Project</strong><span>Evaluate sites, phasing, infrastructure and development options with evidence, uncertainty and community-impact constraints.</span>';grid.appendChild(card);}
    document.addEventListener('click',e=>{const card=e.target.closest('[data-audience="developer"]');if(!card)return;e.preventDefault();e.stopImmediatePropagation();document.querySelectorAll('.audience-card').forEach(x=>x.classList.toggle('selected',x===card));const ws=document.getElementById('nonMunicipalWorkspace');if(ws){ws.hidden=false;const title=ws.querySelector('[data-role="audience-title"]');if(title)title.textContent='Developer / Project Decision Workspace';const intro=ws.querySelector('[data-role="audience-intro"]');if(intro)intro.textContent='Frame a site, infrastructure, phasing, or development decision without pretending unknown evidence is zero.';}},{capture:true});
  });}
})(window);
