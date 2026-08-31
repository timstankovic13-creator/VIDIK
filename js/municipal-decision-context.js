'use strict';
(function(root){
  const required = Object.freeze(['verified','identity','enrichment','provenance']);
  function resolve(city, reconciliation){
    if(!reconciliation || reconciliation.status !== 'verified') throw new Error('municipal-context-geography-not-verified');
    if(!reconciliation.identity || String(reconciliation.identity.geonameid||'') === '') throw new Error('municipal-context-missing-geonameid');
    if(!reconciliation.enrichment || reconciliation.enrichment.provider !== 'WorldPop') throw new Error('municipal-context-missing-worldpop');
    const population=Number(reconciliation.enrichment.population);
    if(!Number.isFinite(population) || population < 0) throw new Error('municipal-context-invalid-population');
    if(!reconciliation.provenance?.identity || reconciliation.provenance.identity.provider !== 'GeoNames') throw new Error('municipal-context-missing-geonames-provenance');
    if(!reconciliation.provenance?.enrichment || reconciliation.provenance.enrichment.provider !== 'WorldPop') throw new Error('municipal-context-missing-worldpop-provenance');
    return Object.freeze({schemaVersion:'municipal-decision-context.v1',city:String(city),geonameid:String(reconciliation.identity.geonameid),identity:{provider:'GeoNames',recordId:String(reconciliation.provenance.identity.record_id),latitude:Number(reconciliation.identity.latitude),longitude:Number(reconciliation.identity.longitude)},population:{provider:'WorldPop',recordId:String(reconciliation.provenance.enrichment.record_id),value:population},match:reconciliation.match||null});
  }
  root.VIDIK_MUNICIPAL_DECISION_CONTEXT={version:'1.0.0',required,resolve};
})(typeof window!=='undefined'?window:globalThis);
if(typeof module!=='undefined') module.exports=globalThis.VIDIK_MUNICIPAL_DECISION_CONTEXT;
