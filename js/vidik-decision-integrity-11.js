'use strict';
/* VIDIK Decision Integrity 11: decision-specific universe disposition, admissibility gates, and audit consistency. */
(function(w){
  function boot(){
    const P=w.VIDIK_PLATFORM_10,U=w.VIDIK_INTERVENTION_UNIVERSE,O=w.VIDIK_MUNICIPAL_BUDGET_OPTIMIZER_10;
    if(!P||!U||!w.vidikUniverseItemsForProblem||!O){setTimeout(boot,25);return;}
    const KEY='VIDIK_P11_UNIVERSE_DISPOSITIONS';
    const read=()=>{try{return JSON.parse(w.localStorage?.getItem(KEY)||'{}')}catch(_){return {}}};
    const write=x=>{try{w.localStorage?.setItem(KEY,JSON.stringify(x))}catch(_){}};
    const clone=x=>JSON.parse(JSON.stringify(x));
    const now=()=>new Date().toISOString();
    const all=problem=>w.vidikUniverseItemsForProblem(problem||'');
    const municipal=(items,j)=>j?items.filter(x=>x.authority!=='OUTSIDE_MUNICIPAL_AUTHORITY'):items;
    const allowed=['ADMISSIBLE','BLOCKED','NOT_APPLICABLE','EVIDENCE_NEEDED'];
    function assess(problem,jurisdiction){
      const every=all(problem),items=municipal(every,jurisdiction),r=read(),dispositions=items.map(x=>r[x.id]).filter(Boolean),by=new Map(dispositions.map(x=>[x.universeId,x]));
      const unresolved=items.filter(x=>!by.has(x.id)).map(x=>({id:x.id,name:x.name,authority:x.authority,domain:x.domain}));
      const admissible=items.filter(x=>by.get(x.id)?.state==='ADMISSIBLE');
      const evidenceNeeded=items.filter(x=>by.get(x.id)?.state==='EVIDENCE_NEEDED');
      const blocked=items.filter(x=>by.get(x.id)?.state==='BLOCKED');
      const notApplicable=items.filter(x=>by.get(x.id)?.state==='NOT_APPLICABLE');
      return {candidateCount:items.length,dispositionCount:dispositions.length,coverageRatio:items.length?dispositions.length/items.length:0,complete:items.length>0&&unresolved.length===0,optimizable:items.length>0&&unresolved.length===0&&evidenceNeeded.length===0&&admissible.length>0,admissibleCount:admissible.length,blockedCount:blocked.length,notApplicableCount:notApplicable.length,evidenceNeededCount:evidenceNeeded.length,unresolved,evidenceNeeded:evidenceNeeded.map(x=>({id:x.id,name:x.name})),outsideAuthority:every.filter(x=>x.authority==='OUTSIDE_MUNICIPAL_AUTHORITY').map(x=>({id:x.id,name:x.name,authority:x.authority})),rule:'Every discovered candidate must receive an explicit disposition before a comprehensive optimization claim. Unknown is not zero; evidence-needed remains unresolved.'};
    }
    function disposition(record={}){
      const item=all(record.problem).find(x=>x.id===record.universeId);
      if(!item)return {ok:false,code:'UNKNOWN_UNIVERSE_ITEM'};
      if(!allowed.includes(record.state))return {ok:false,code:'INVALID_UNIVERSE_DISPOSITION'};
      if(item.authority==='OUTSIDE_MUNICIPAL_AUTHORITY')return {ok:false,code:'OUTSIDE_MUNICIPAL_AUTHORITY'};
      if(!String(record.rationale||'').trim())return {ok:false,code:'DISPOSITION_RATIONALE_REQUIRED'};
      if(record.state==='ADMISSIBLE'){
        if(!Array.isArray(record.evidenceIds)||!record.evidenceIds.length)return {ok:false,code:'EVIDENCE_REQUIRED'};
        for(const k of ['cost','capacity','expectedValue'])if(typeof record[k]!=='number'||!Number.isFinite(record[k])||record[k]<0)return {ok:false,code:'ADMISSIBLE_PARAMETER_REQUIRED'};
        if(!record.uncertainty||!Number.isFinite(Number(record.uncertainty.low))||!Number.isFinite(Number(record.uncertainty.high))||Number(record.uncertainty.high)<Number(record.uncertainty.low))return {ok:false,code:'UNCERTAINTY_REQUIRED'};
        if(!record.constraints||!Array.isArray(record.constraints.legal)||!Array.isArray(record.constraints.implementation)||!Array.isArray(record.constraints.capacity))return {ok:false,code:'IMPLEMENTATION_CONSTRAINTS_REQUIRED'};
      }
      const r=read();r[item.id]={...clone(record),universeId:item.id,authority:item.authority,dispositionAt:now()};write(r);return {ok:true,disposition:r[item.id]};
    }
    const originalCreate=P.createDecision,originalEvaluate=P.evaluate,originalPortfolio=P.optimizeMunicipalPortfolio;
    P.setMunicipalUniverseDisposition=disposition;
    P.getMunicipalUniverseDispositions=(problem,j)=>Object.values(read()).filter(x=>all(problem).some(i=>i.id===x.universeId)&&(!j||x.authority!=='OUTSIDE_MUNICIPAL_AUTHORITY'));
    P.assessMunicipalDecisionUniverse=assess;
    P.createDecision=function(input){const d=originalCreate(input);if(d.audience==='municipal'){const a=assess(d.problem,d.jurisdiction);d.universeCoverage=a;d.governance=d.governance||{};d.governance.universe={...a,required:true};d.audit.push({event:'UNIVERSE_INTEGRITY_ASSESSED',at:now(),candidateCount:a.candidateCount,dispositionCount:a.dispositionCount,complete:a.complete,optimizable:a.optimizable});}return d;};
    P.evaluate=function(d,fn){if(d?.audience==='municipal'){const a=assess(d.problem,d.jurisdiction);d.universeCoverage=a;d.governance=d.governance||{};d.governance.universe={...a,required:true};if(!a.complete)return {ok:false,code:'MUNICIPAL_UNIVERSE_INCOMPLETE',message:'Decision universe is incomplete: every discovered candidate needs an explicit disposition.',details:a};if(!a.optimizable)return {ok:false,code:'MUNICIPAL_UNIVERSE_NOT_OPTIMIZABLE',message:'Decision universe is classified but contains unresolved evidence-needed candidates or no admissible options.',details:a};}return originalEvaluate(d,fn);};
    P.optimizeMunicipalPortfolio=function(d,budgetId){if(d?.audience==='municipal'){const a=assess(d.problem,d.jurisdiction);if(!a.complete)return {ok:false,code:'MUNICIPAL_UNIVERSE_INCOMPLETE',details:a};if(!a.optimizable)return {ok:false,code:'MUNICIPAL_UNIVERSE_NOT_OPTIMIZABLE',details:a};const r=read();const admissible=municipal(all(d.problem),d.jurisdiction).filter(x=>r[x.id]?.state==='ADMISSIBLE');d.options=admissible.map(x=>{const v=r[x.id];return {id:x.id,universeId:x.id,name:x.name,evidenceStatus:'VERIFIED',objectiveMetric:v.objectiveMetric||d.objective,cost:v.cost,maxCost:v.maxCost??v.cost,minCost:v.minCost??v.cost,expectedValue:v.expectedValue,capacity:v.capacity,resources:v.resources||{},dependsOn:v.dependsOn||[],excludes:v.excludes||[],minShare:v.minShare,maxShare:v.maxShare};});d.universeCoverage=a;}return originalPortfolio?originalPortfolio(d,budgetId):{ok:false,code:'OPTIMIZER_API_UNAVAILABLE'};};
    w.VIDIK_DECISION_INTEGRITY_11={VERSION:'11.0.0',ready:true,states:allowed,rule:'DISCOVER → DISPOSITION → ADMISSIBILITY → FULL-ENVELOPE OPTIMIZE',assess,disposition};
  }
  boot();
})(window);
