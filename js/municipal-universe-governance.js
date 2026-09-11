'use strict';
(function(w){
  function wait(){
    const U=w.VIDIK_INTERVENTION_UNIVERSE, P=w.VIDIK_PLATFORM_10;
    if(!U||!P){setTimeout(wait,25);return;}
    const originalCreate=P.createDecision, originalEvaluate=P.evaluate;
    P.discoverMunicipalUniverse=function(problem){return w.vidikUniverseItemsForProblem(problem||'')};
    P.assessMunicipalUniverse=function(problem,verifiedIds){return w.vidikUniverseCoverage(problem||'',verifiedIds||[])};
    P.createDecision=function(input){
      const d=originalCreate(input);
      if(d.audience==='municipal'){
        const items=w.vidikUniverseItemsForProblem(d.problem);
        d.interventionUniverse=items;
        d.universeCoverage=w.vidikUniverseCoverage(d.problem,(d.options||[]).map(x=>x.universeId||x.id));
        d.governance.universe={required:true,complete:d.universeCoverage.complete,candidateCount:d.universeCoverage.candidateCount,unresolved:d.universeCoverage.unresolved};
        d.audit.push({event:'INTERVENTION_UNIVERSE_DISCOVERED',at:new Date().toISOString(),candidateCount:items.length,complete:d.universeCoverage.complete});
      }
      return d;
    };
    P.evaluate=function(d,fn){
      if(d&&d.audience==='municipal'){
        const coverage=d.universeCoverage||w.vidikUniverseCoverage(d.problem||'',(d.options||[]).map(x=>x.universeId||x.id));
        if(!coverage.complete)return {ok:false,code:'MUNICIPAL_UNIVERSE_INCOMPLETE',message:'Municipal optimization is blocked because the intervention universe is not completely evidenced/verified for this problem.',details:coverage};
      }
      return originalEvaluate(d,fn);
    };
    P.UNIVERSE_CONTRACT={version:'2.0.0',rule:'DISCOVER → VERIFY → OPTIMIZE',unknownIsNotExcluded:true,noFalseCompleteness:true};
    w.VIDIK_MUNICIPAL_UNIVERSE_GOVERNANCE={ready:true};
  }
  wait();
})(window);
