'use strict';
(function(root){
  const required = Object.freeze(['verified','identity','enrichment','provenance']);
  function resolve(city, reconciliation){
    const adapters = root.VIDIK_CITY_SOURCE_ADAPTERS;
    if(!adapters || typeof adapters.decisionContext!=='function') throw new Error('municipal-context-adapter-boundary-unavailable');
    if(!reconciliation || reconciliation.status!=='verified') throw new Error('municipal-context-geography-not-verified');
    const i=reconciliation.identity;
    const e=reconciliation.enrichment;
    const p=reconciliation.provenance;
    if(!i || !Number.isFinite(Number(i.latitude)) || !Number.isFinite(Number(i.longitude)) || !p || !p.identity || String(i.geonameid||'')!==String(p.identity.record_id||'')) throw new Error('municipal-context-geonames-id-mismatch');
    if(p.identity.provider!=='GeoNames') throw new Error('municipal-context-missing-geonames-provenance');
    if(!e || e.provider!=='WorldPop' || !p.enrichment || p.enrichment.provider!=='WorldPop') throw new Error('municipal-context-missing-worldpop');
    if(String(e.geonameid||'')!==String(i.geonameid||'')) throw new Error('municipal-context-geonames-id-mismatch');
    if(String(p.enrichment.record_id||'')!==String(i.geonameid||'')) throw new Error('municipal-context-worldpop-id-mismatch');
    return adapters.decisionContext(city, reconciliation);
  }
  root.VIDIK_MUNICIPAL_DECISION_CONTEXT=Object.freeze({version:'1.1.0',required,resolve});
})(typeof window!=='undefined'?window:globalThis);
if(typeof module!=='undefined') module.exports=globalThis.VIDIK_MUNICIPAL_DECISION_CONTEXT;
