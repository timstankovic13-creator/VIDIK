'use strict';

/*
 * VIDIK geographic reconciliation layer.
 *
 * Design constraints:
 * - GeoNames cities500 is the canonical populated-place gazetteer contract.
 * - WorldPop is an enrichment source, never an identity source.
 * - No live network access occurs here; callers inject reproducible snapshots.
 * - Ambiguous or weak matches fail closed rather than silently selecting a place.
 */
const VIDIK_GEOGRAPHY={
  schemaVersion:'geography-reconciliation.v1',
  gazetteer:{provider:'GeoNames',asset:'cities500',role:'identity',requiredFields:['geonameid','name','latitude','longitude','country_code']},
  enrichment:{provider:'WorldPop',role:'population-enrichment',identityAuthority:'GeoNames'},
  matchThresholds:{exact:1,normalized:0.98,alias:0.95},
  status:{verified:'verified',ambiguous:'ambiguous',unresolved:'unresolved',invalid:'invalid'}
};

function geoNorm(value){return String(value??'').trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function validNumber(v){return Number.isFinite(Number(v));}
function validGeoRecord(r){return r&&String(r.geonameid??'').trim()&&String(r.name??'').trim()&&validNumber(r.latitude)&&validNumber(r.longitude)&&String(r.country_code??'').trim();}
function geoMatchScore(input,r){
  const city=geoNorm(input.city), name=geoNorm(r.name);
  if(city&&city===name)return 1;
  const aliases=Array.isArray(r.alternate_names)?r.alternate_names.map(geoNorm):[];
  if(city&&aliases.includes(city))return VIDIK_GEOGRAPHY.matchThresholds.alias;
  return 0;
}
function reconcileGeography(input,gazetteer,worldpop=[]){
  if(!input||!String(input.city??'').trim()||!Array.isArray(gazetteer))return {status:VIDIK_GEOGRAPHY.status.invalid,reason:'city_and_gazetteer_required',schemaVersion:VIDIK_GEOGRAPHY.schemaVersion};
  const country=String(input.country_code??input.country??'').trim().toUpperCase();
  const valid=gazetteer.filter(validGeoRecord).filter(r=>!country||String(r.country_code).toUpperCase()===country);
  const ranked=valid.map(r=>({record:r,score:geoMatchScore(input,r)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
  if(!ranked.length)return {status:VIDIK_GEOGRAPHY.status.unresolved,reason:'no_admissible_gazetteer_match',schemaVersion:VIDIK_GEOGRAPHY.schemaVersion};
  const top=ranked[0], tied=ranked.filter(x=>x.score===top.score);
  if(tied.length!==1)return {status:VIDIK_GEOGRAPHY.status.ambiguous,reason:'multiple_equal_matches',candidates:tied.map(x=>x.record.geonameid),schemaVersion:VIDIK_GEOGRAPHY.schemaVersion};
  const r=top.record;
  const enrichment=Array.isArray(worldpop)?worldpop.find(x=>String(x.geonameid)===String(r.geonameid)):null;
  return {
    status:VIDIK_GEOGRAPHY.status.verified,
    schemaVersion:VIDIK_GEOGRAPHY.schemaVersion,
    identity:{geonameid:String(r.geonameid),name:String(r.name),country_code:String(r.country_code).toUpperCase(),latitude:Number(r.latitude),longitude:Number(r.longitude)},
    enrichment:enrichment?{provider:'WorldPop',geonameid:String(r.geonameid),population:Number(enrichment.population)}:null,
    provenance:{identity:{provider:'GeoNames',asset:'cities500',record_id:String(r.geonameid)},enrichment:enrichment?{provider:'WorldPop',record_id:String(r.geonameid)}:null},
    match:{method:top.score===1?'exact-or-normalized-name':'alternate-name',score:top.score}
  };
}

if(typeof window!=='undefined')window.VIDIK_GEOGRAPHY=reconcileGeography;
if(typeof module!=='undefined')module.exports={VIDIK_GEOGRAPHY,reconcileGeography};
