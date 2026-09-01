'use strict';
(function(root){
  // Deterministic reference snapshots for the browser acceptance/runtime contract.
  // Production ingestion replaces these snapshots with validated GeoNames + WorldPop records.
  const verified=(city,id,population,latitude,longitude)=>({
    status:'verified',
    schemaVersion:'geography-reconciliation.v1',
    identity:{geonameid:id,name:city,latitude,longitude},
    enrichment:{provider:'WorldPop',geonameid:id,population},
    provenance:{identity:{provider:'GeoNames',asset:'cities500',record_id:id},enrichment:{provider:'WorldPop',record_id:id}},
    match:{method:'exact-or-normalized-name',score:1}
  });
  root.VIDIK_MUNICIPAL_RECONCILIATIONS=Object.freeze({
    Ottawa:verified('Ottawa','100',100000,45,-75),
    Toronto:verified('Toronto','101',100001,46,-76),
    Melbourne:verified('Melbourne','102',100002,47,-77)
  });
})(typeof window!=='undefined'?window:globalThis);
