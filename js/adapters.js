'use strict';

// Browser-facing registry mirrors the server-side municipal ingestion contracts.
const ADAPTERS = ['Ottawa','Toronto','Melbourne'].map(city => {
  const source = window.VIDIK_CITY_SOURCE_ADAPTERS?.get(city);
  if (!source) throw new Error(`missing-city-source-contract:${city}`);
  return {
    city,
    adapter: source.provider,
    sourceType: source.sourceType,
    sourceUrl: source.sourceUrl,
    mode: source.retrievalMode,
    identityAuthority: source.identityAuthority,
    populationEnrichment: source.populationEnrichment,
    status: 'live-source-validated'
  };
});

function renderAdapters(){
  const e=document.getElementById('adapterRegistry');
  if(!e)return;
  e.innerHTML=ADAPTERS.map(x=>'<div class="candidate"><b>'+hEsc(x.city)+'</b><div class="small">'+hEsc(x.adapter)+' · '+hEsc(x.sourceType)+'</div><div class="small">'+hEsc(x.mode)+' · <b>'+hEsc(x.status)+'</b></div><div class="small">Identity: '+hEsc(x.identityAuthority)+' · Population: '+hEsc(x.populationEnrichment)+'</div></div>').join('');
}
