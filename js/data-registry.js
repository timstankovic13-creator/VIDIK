'use strict';

const VIDIK_DATA_REGISTRY={
  schemaVersion:'city-registry.v1',
  census:{id:'wup-2025-population-ge50k',version:'1.0.0',expectedRecords:12138,sourceAsset:'VIDIK_12138_Three_Score_Public_ARS_OPS_v0_1.xlsx'},
  expansionTier:{id:'wup-2025-urban-centres-below-50k',version:'0.1.0',expectedRecords:4690,enabled:false},
  evidence:{id:'vidik-evidence-provenance-v1',version:'1.0.0'},
  decisionSnapshotVersion:'decision-datasets.v1'
};

function normalizeCityIdentity(value){return String(value??'').trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
function stableCityId(city,country){return 'wup25-'+normalizeCityIdentity(country||'unknown')+'-'+normalizeCityIdentity(city);}
function cityIdentity(city,country){return {city_id:stableCityId(city,country),city:String(city??''),country:String(country??''),registry_schema:VIDIK_DATA_REGISTRY.schemaVersion,census_id:VIDIK_DATA_REGISTRY.census.id,census_version:VIDIK_DATA_REGISTRY.census.version};}
function decisionDatasetSnapshot(city,country){return {snapshot_version:VIDIK_DATA_REGISTRY.decisionSnapshotVersion,census:{id:VIDIK_DATA_REGISTRY.census.id,version:VIDIK_DATA_REGISTRY.census.version,expected_records:VIDIK_DATA_REGISTRY.census.expectedRecords},evidence:{id:VIDIK_DATA_REGISTRY.evidence.id,version:VIDIK_DATA_REGISTRY.evidence.version},city:cityIdentity(city,country),captured_at:new Date().toISOString()};}
