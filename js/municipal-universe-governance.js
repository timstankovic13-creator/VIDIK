'use strict';
(function(w){
  function wait(){
    const U=w.VIDIK_INTERVENTION_UNIVERSE,P=w.VIDIK_PLATFORM_10;
    if(!U||!P){setTimeout(wait,25);return;}
    const originalCreate=P.createDecision,originalEvaluate=P.evaluate;
    function assess(problem,verifiedIds,jurisdiction){
      const all=w.vidikUniverseItemsForProblem(problem||'');
      const candidates=jurisdiction?all.filter(x=>x.authority!=='OUTSIDE_MUNICIPAL_AUTHORITY'):all;
      const v=new Set(verifiedIds||[]),unresolved=candidates.filter(x=>!v.has(x.id));
      const outside=all.filter(x=>x.authority==='OUTSIDE_MUNICIPAL_AUTHORITY');
      return {candidateCount:candidates.length,verifiedCount:candidates.length-unresolved.length,coverageRatio:candidates.length?(candidates.length-unresolved.length)/candidates.length:0,complete:candidates.length>0&&unresolved.length===0,unresolved:unresolved.map(x=>({id:x.id,name:x.name,authority:x.authority,domain:x.domain})),outsideAuthority:outside.map(x=>({id:x.id,name:x.name,authority:x.authority})),rule:'DISCOVER → VERIFY → OPTIMIZE; unknown is not excluded and unresolved material options block optimization.'};
    }
    P.discoverMunicipalUniverse=function(problem,jurisdiction){const all=w.vidikUniverseItemsForProblem(problem||'');const items=jurisdiction?all.filter(x=>x.authority!=='OUTSIDE_MUNICIPAL_AUTHORITY'):all;return {items,excludedOutsideAuthority:all.filter(x=>x.authority==='OUTSIDE_MUNICIPAL_AUTHORITY'),coverage:assess(problem,[],jurisdiction)}};
    P.assessMunicipalUniverse=assess;
    P.createDecision=function(input){
      const d=originalCreate(input);
      if(d.audience==='municipal'){
        const items=w.vidikUniverseItemsForProblem(d.problem||'');
        const verified=(d.options||[]).map(x=>x.universeId||x.id).filter(Boolean);
        const coverage=assess(d.problem,verified,d.jurisdiction);
        d.interventionUniverse=items;
        d.universeCoverage=coverage;
        d.governance.universe={required:true,complete:coverage.complete,candidateCount:coverage.candidateCount,verifiedCount:coverage.verifiedCount,coverageRatio:coverage.coverageRatio,unresolved:coverage.unresolved,outsideAuthority:coverage.outsideAuthority};
        d.audit.push({event:'INTERVENTION_UNIVERSE_DISCOVERED',at:new Date().toISOString(),candidateCount:items.length,verifiedCount:coverage.verifiedCount,complete:coverage.complete});
      }
      return d;
    };
    P.evaluate=function(d,fn){
      if(d&&d.audience==='municipal'){
        const coverage=d.universeCoverage||assess(d.problem,(d.options||[]).map(x=>x.universeId||x.id).filter(Boolean),d.jurisdiction);
        if(!coverage.complete)return {ok:false,code:'MUNICIPAL_UNIVERSE_INCOMPLETE',message:'Municipal optimization is blocked because material intervention-universe coverage is unresolved.',details:coverage};
      }
      return originalEvaluate(d,fn);
    };
    P.UNIVERSE_CONTRACT={version:'2.0.0',rule:'DISCOVER → VERIFY → OPTIMIZE',unknownIsNotExcluded:true,noFalseCompleteness:true,outsideAuthorityExcludedFromMunicipalOptimization:true};
    w.VIDIK_MUNICIPAL_UNIVERSE_GOVERNANCE={ready:true,version:'2.0.0'};
  }
  wait();
})(window);
