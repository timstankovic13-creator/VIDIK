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
  function get(city){ if(!sources[city]) throw new Error('unsupported-city-adapter'); return {...sources[city]}; }
  function provenance(city, recordId, retrievedAt){
    if(!recordId || typeof recordId!=='string') throw new Error('invalid-source-record-id');
    const s=get(city);
    return {city:s.city,jurisdiction:s.jurisdiction,provider:s.provider,sourceType:s.sourceType,sourceUrl:s.sourceUrl,recordId,retrievedAt:retrievedAt||null,identityAuthority:s.identityAuthority,populationEnrichment:s.populationEnrichment};
  }
  function validate(record){
    if(!record || typeof record!=='object') return {valid:false,reason:'invalid-record'};
    if(typeof record.city!=='string' || !sources[record.city]) return {valid:false,reason:'unsupported-city'};
    if(!record.provenance || typeof record.provenance.recordId!=='string' || !record.provenance.provider) return {valid:false,reason:'missing-provenance'};
    return {valid:true,city:record.city,provider:record.provenance.provider,recordId:record.provenance.recordId};
  }
  root.VIDIK_CITY_SOURCE_ADAPTERS = freeze({version:'1.0.0',cities, sources, get, provenance, validate});
})(typeof window!=='undefined'?window:globalThis);
if(typeof module!=='undefined') module.exports=globalThis.VIDIK_CITY_SOURCE_ADAPTERS;
