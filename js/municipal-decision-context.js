'use strict';
(function(root){
  const required = Object.freeze(['verified','identity','enrichment','provenance']);
  function resolve(city, reconciliation){
    const adapters = root.VIDIK_CITY_SOURCE_ADAPTERS;
    if(!adapters || typeof adapters.decisionContext!=='function') throw new Error('municipal-context-adapter-boundary-unavailable');
    return adapters.decisionContext(city, reconciliation);
  }
  root.VIDIK_MUNICIPAL_DECISION_CONTEXT=Object.freeze({version:'1.0.0',required,resolve});
})(typeof window!=='undefined'?window:globalThis);
if(typeof module!=='undefined') module.exports=globalThis.VIDIK_MUNICIPAL_DECISION_CONTEXT;
