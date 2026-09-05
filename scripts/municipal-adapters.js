#!/usr/bin/env node
'use strict';
const crypto = require('crypto');
const ADAPTERS = Object.freeze({
  Ottawa: Object.freeze({ sourceType:'ogc-api-records', catalogUrl:'https://open.ottawa.ca/api/search/v1/catalog', mode:'controlled-server-side', identityAuthority:'GeoNames', populationEnrichment:'WorldPop' }),
  Toronto: Object.freeze({ sourceType:'ckan', catalogUrl:'https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action/package_search?q=traffic%20collisions', mode:'controlled-server-side', identityAuthority:'GeoNames', populationEnrichment:'WorldPop' }),
  Melbourne: Object.freeze({ sourceType:'opendatasoft-explore-api', catalogUrl:'https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/pedestrian-counting-system-monthly-counts-per-hour/records?limit=10', mode:'controlled-server-side', identityAuthority:'GeoNames', populationEnrichment:'WorldPop' }),
});
function adapterFor(city){const a=ADAPTERS[String(city||'').trim()];if(!a)throw new Error(`unsupported-municipality:${city}`);return{city:String(city).trim(),...a};}
function normalizeRecord(record){
  if(!record||typeof record!=='object'||Array.isArray(record))throw new Error('invalid-record');
  const ordered={};
  for(const key of Object.keys(record).sort()){
    const normalizedKey=String(key).trim();
    if(!normalizedKey)throw new Error('invalid-record-key');
    if(Object.prototype.hasOwnProperty.call(ordered,normalizedKey))throw new Error(`normalized-key-collision:${normalizedKey}`);
    ordered[normalizedKey]=record[key];
  }
  return ordered;
}
function normalizeRecords(records){if(!Array.isArray(records))throw new Error('records-must-be-array');return records.map(normalizeRecord);}
function provenance({city,sourceUrl,retrievedAt,records}){const normalized=normalizeRecords(records);return{schemaVersion:'municipal-adapter.v1',city:String(city),sourceUrl:String(sourceUrl),retrievedAt:String(retrievedAt),rowCount:normalized.length,normalizedSha256:crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex'),identityAuthority:ADAPTERS[city]?.identityAuthority||'GeoNames',populationEnrichment:ADAPTERS[city]?.populationEnrichment||'WorldPop',status:'validated'};}
function melbourneRecords(body){if(Array.isArray(body?.results))return body.results;if(Array.isArray(body?.records))return body.records;return null;}
function validateCatalog(city,body){adapterFor(city);if(!body||typeof body!=='object'||Array.isArray(body))throw new Error(`invalid-catalog:${city}`);if(city==='Toronto'&&body.success!==true)throw new Error('toronto-catalog-not-success');if(city==='Melbourne'&&!melbourneRecords(body))throw new Error('melbourne-catalog-shape-invalid');if(city==='Ottawa'&&!Array.isArray(body.collections)&&!Array.isArray(body.links)&&!body.id)throw new Error('ottawa-catalog-shape-invalid');return true;}
async function fetchJson(url,fetchImpl=globalThis.fetch){if(typeof fetchImpl!=='function')throw new Error('fetch-unavailable');const attempts=3;let lastError=null;for(let attempt=1;attempt<=attempts;attempt++){const controller=typeof AbortController==='function'?new AbortController():null;const timer=controller?setTimeout(()=>controller.abort(),20000):null;try{const response=await fetchImpl(url,{headers:{accept:'application/json','user-agent':'VIDIK-municipal-live-validation/1.0'},signal:controller?.signal});if(!response||!response.ok)throw new Error(`upstream-http:${response?.status??'unknown'}`);return await response.json();}catch(error){lastError=error;if(attempt<attempts)await new Promise(resolve=>setTimeout(resolve,500*attempt));}finally{if(timer)clearTimeout(timer);}}throw lastError||new Error('upstream-fetch-failed');}
async function inspectCatalog(city,fetchImpl=globalThis.fetch){const adapter=adapterFor(city);const body=await fetchJson(adapter.catalogUrl,fetchImpl);validateCatalog(city,body);return{adapter,fetched:true,sourceUrl:adapter.catalogUrl,body};}
async function ingestCatalog(city,fetchImpl=globalThis.fetch,now=new Date()){const result=await inspectCatalog(city,fetchImpl);const records=city==='Toronto'?(result.body.result?.results||[]):city==='Melbourne'?melbourneRecords(result.body):(result.body.collections||result.body.links||[result.body]);if(!records.length)throw new Error(`empty-source:${city}`);const retrievedAt=now.toISOString();return{city,sourceUrl:result.sourceUrl,retrievedAt,recordCount:records.length,records:normalizeRecords(records),provenance:provenance({city,sourceUrl:result.sourceUrl,retrievedAt,records})};}
module.exports={ADAPTERS,adapterFor,normalizeRecord,normalizeRecords,provenance,validateCatalog,fetchJson,inspectCatalog,ingestCatalog};
