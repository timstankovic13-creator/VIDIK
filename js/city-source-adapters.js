'use strict';

// VIDIK city source adapters v1: reproducible, provenance-first municipal source contracts.
(function(root){
  const freeze = x => Object.freeze(x);
  const sources = {
    Ottawa: freeze({city:'Ottawa', jurisdiction:'CA-ON', provider:'City of Ottawa Open Data', sourceType:'municipal-open-data', status:'reproducible', sourceUrl:'https://open.ottawa.ca/', retrievalMode:'controlled-server-side', identityAuthority:'GeoNames', populationEnrichment:'WorldPop'}),
    Toronto: freeze({city:'Toronto', jurisdiction:'CA-ON', provider:'City of Toronto Open Data', sourceType:'municipal-open-data', status:'reproducible', sourceUrl:'https://open.toronto.ca/', retrievalMode:'controlled-server-side', identityAuthority:'GeoNames', populationEnrichment:'WorldPop'}),
    Melbourne: freeze({city:'Melbourne', jurisdiction:'AU-VIC', provider:'City of Melbourne Open Data', sourceType:'municipal-open-data', status:'reproducible', sourceUrl:'https://data.melbourne.vic.gov.au/', retrievalMode:'controlled-server-side', identityAuthority:'GeoNames', populationEnrichment:'WorldPop'})
  };
  const cities = Object.keys(sources);
  const finite = x => typeof x==='number' && Number.isFinite(x);
  const isoDateTime = x => typeof x==='string' && !Number.isNaN(Date.parse(x));
  function get(city){ if(!sources[city]) throw new Error('unsupported-city-adapter'); return {...sources[city]}; }
  function provenance(city, recordId, retrievedAt){
    if(!recordId || typeof recordId!=='string') throw new Error('invalid-source-record-id');
    if(!isoDateTime(retrievedAt)) throw new Error('invalid-retrieved-at');
    const s=get(city);
    return {city:s.city,jurisdiction:s.jurisdiction,provider:s.provider,sourceType:s.sourceType,sourceUrl:s.sourceUrl,recordId,retrievedAt,identityAuthority:s.identityAuthority,populationEnrichment:s.populationEnrichment};
  }
  function validate(record){
    if(!record || typeof record!=='object' || Array.isArray(record)) return {valid:false,reason:'invalid-record'};
    if(typeof record.city!=='string' || !sources[record.city]) return {valid:false,reason:'unsupported-city'};
    const expected=sources[record.city],p=record.provenance;
    if(!p || typeof p.recordId!=='string' || !p.provider || !p.sourceType || !p.sourceUrl || !p.jurisdiction || !p.identityAuthority) return {valid:false,reason:'missing-provenance'};
    if(p.provider!==expected.provider) return {valid:false,reason:'provenance-provider-mismatch'};
    if(p.sourceUrl!==expected.sourceUrl || !String(p.sourceUrl).startsWith('https://')) return {valid:false,reason:'provenance-source-mismatch'};
    if(p.jurisdiction!==expected.jurisdiction) return {valid:false,reason:'provenance-jurisdiction-mismatch'};
    if(p.sourceType!==expected.sourceType) return {valid:false,reason:'provenance-source-type-mismatch'};
    if(p.identityAuthority!==expected.identityAuthority) return {valid:false,reason:'provenance-identity-authority-mismatch'};
    if(!isoDateTime(p.retrievedAt)) return {valid:false,reason:'invalid-retrieved-at'};
    return {valid:true,city:record.city,provider:p.provider,recordId:p.recordId};
  }
  function decisionContext(city,reconciliation){
    const s=get(city);
    if(!reconciliation || reconciliation.status!=='verified') throw new Error('municipal-context-geography-not-verified');
    const i=reconciliation.identity,e=reconciliation.enrichment,p=reconciliation.provenance;
    if(!i || !finite(Number(i.latitude)) || !finite(Number(i.longitude)) || !p || !p.identity || String(i.geonameid||'')!==String(p.identity.record_id||'')) throw new Error('municipal-context-geonames-id-mismatch');
    if(p.identity.provider!=='GeoNames') throw new Error('municipal-context-missing-geonames-provenance');
    if(!e || e.provider!=='WorldPop' || !p.enrichment || p.enrichment.provider!=='WorldPop') throw new Error('municipal-context-missing-worldpop');
    if(String(e.geonameid||'')!==String(i.geonameid||'')) throw new Error('municipal-context-geonames-id-mismatch');
    if(String(p.enrichment.record_id||'')!==String(i.geonameid||'')) throw new Error('municipal-context-worldpop-id-mismatch');
    const population=Number(e.population);
    if(!Number.isFinite(population)||population<0) throw new Error('municipal-context-invalid-population');
    return Object.freeze({schemaVersion:'municipal-decision-context.v1',city:s.city,jurisdiction:s.jurisdiction,identity:{provider:'GeoNames',recordId:String(i.geonameid),latitude:Number(i.latitude),longitude:Number(i.longitude)},population:{provider:'WorldPop',recordId:String(e.geonameid),value:population},match:reconciliation.match||null});
  }
  root.VIDIK_CITY_SOURCE_ADAPTERS = freeze({version:'1.1.0',cities, sources, get, provenance, validate, decisionContext});
})(typeof window!=='undefined'?window:globalThis);
if(typeof module!=='undefined') module.exports=globalThis.VIDIK_CITY_SOURCE_ADAPTERS;
