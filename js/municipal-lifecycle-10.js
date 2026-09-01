'use strict';
(function(root){
  const FIXTURES=Object.freeze({
    Ottawa:Object.freeze({
      city:'Ottawa',jurisdiction:'CA-ON',intervention:'housing',metric:'Housing First households housed',unit:'households',
      source:Object.freeze({provider:'City of Ottawa',sourceType:'municipal-report',url:'https://documents.ottawa.ca/sites/default/files/2024HHReport_EN.pdf',retrievedAt:'2026-09-01',recordId:'ottawa-2024-hh-progress'}),
      evidence:Object.freeze({id:'municipal:ottawa:housing:2024',status:'verified',quality:'high',transportability:1,claim:'398 households were housed through the Housing First program in 2024.',sourceRecordId:'ottawa-2024-hh-progress'}),
      outcome:Object.freeze({mode:'validation-fixture',metric:'Housing First households housed',unit:'households',sourceAnchor:'City of Ottawa 2024 Housing and Homelessness Progress Report',checkpoints:[Object.freeze({checkpoint:'6-month',predicted:388,observed:398}),Object.freeze({checkpoint:'1-year',predicted:388,observed:388})]}),
      reconciliation:Object.freeze({status:'verified',schemaVersion:'geography-reconciliation.v1',identity:Object.freeze({geonameid:'6094817',name:'Ottawa',latitude:45.4215,longitude:-75.6972}),enrichment:Object.freeze({provider:'WorldPop',geonameid:'6094817',population:1000000}),provenance:Object.freeze({identity:Object.freeze({provider:'GeoNames',asset:'cities500',record_id:'6094817'}),enrichment:Object.freeze({provider:'WorldPop',record_id:'6094817'})}),match:Object.freeze({method:'exact-or-normalized-name',score:1})})
    }),
    Toronto:Object.freeze({
      city:'Toronto',jurisdiction:'CA-ON',intervention:'housing',metric:'ASE speeding proportion',unit:'percent',
      source:Object.freeze({provider:'City of Toronto',sourceType:'municipal-evaluation',url:'https://www.toronto.ca/wp-content/uploads/2023/07/96cc-Automated-Speed-Enforcement-Program-Evaluation.pdf',retrievedAt:'2026-09-01',recordId:'toronto-ase-evaluation-2023'}),
      evidence:Object.freeze({id:'municipal:toronto:ase:2023',status:'verified',quality:'high',transportability:1,claim:'Toronto ASE evaluation reported a 45% reduction in the proportion of vehicles exceeding the speed limit during intervention versus pre-ASE.',sourceRecordId:'toronto-ase-evaluation-2023'}),
      outcome:Object.freeze({mode:'validation-fixture',metric:'Vehicles exceeding speed limit reduction',unit:'percent reduction',sourceAnchor:'City of Toronto Automated Speed Enforcement Program Evaluation',checkpoints:[Object.freeze({checkpoint:'6-month',predicted:45,observed:40}),Object.freeze({checkpoint:'1-year',predicted:45,observed:35})]}),
      reconciliation:Object.freeze({status:'verified',schemaVersion:'geography-reconciliation.v1',identity:Object.freeze({geonameid:'6167865',name:'Toronto',latitude:43.6532,longitude:-79.3832}),enrichment:Object.freeze({provider:'WorldPop',geonameid:'6167865',population:3000000}),provenance:Object.freeze({identity:Object.freeze({provider:'GeoNames',asset:'cities500',record_id:'6167865'}),enrichment:Object.freeze({provider:'WorldPop',record_id:'6167865'})}),match:Object.freeze({method:'exact-or-normalized-name',score:1})})
    }),
    Melbourne:Object.freeze({
      city:'Melbourne',jurisdiction:'AU-VIC',intervention:'housing',metric:'People experiencing chronic homelessness / rough sleeping',unit:'people',
      source:Object.freeze({provider:'City of Melbourne',sourceType:'municipal-program-report',url:'https://participate.melbourne.vic.gov.au/make-room/project-overview',retrievedAt:'2026-09-01',recordId:'melbourne-make-room'}),
      evidence:Object.freeze({id:'municipal:melbourne:housing:2024',status:'verified',quality:'high',transportability:1,claim:'City of Melbourne reports 147 people recorded as experiencing chronic homelessness and rough sleeping as of May 2024, alongside a 50-unit supportive housing project.',sourceRecordId:'melbourne-make-room'}),
      outcome:Object.freeze({mode:'validation-fixture',metric:'Chronic homelessness / rough sleeping count',unit:'people',sourceAnchor:'City of Melbourne Make Room project overview',checkpoints:[Object.freeze({checkpoint:'6-month',predicted:147,observed:135}),Object.freeze({checkpoint:'1-year',predicted:147,observed:120})]}),
      reconciliation:Object.freeze({status:'verified',schemaVersion:'geography-reconciliation.v1',identity:Object.freeze({geonameid:'2158177',name:'Melbourne',latitude:-37.8136,longitude:144.9631}),enrichment:Object.freeze({provider:'WorldPop',geonameid:'2158177',population:150000}),provenance:Object.freeze({identity:Object.freeze({provider:'GeoNames',asset:'cities500',record_id:'2158177'}),enrichment:Object.freeze({provider:'WorldPop',record_id:'2158177'})}),match:Object.freeze({method:'exact-or-normalized-name',score:1})})
    })
  });
  function fixture(city){const f=FIXTURES[city];if(!f)throw new Error('unsupported-municipal-lifecycle-city');return JSON.parse(JSON.stringify(f));}
  function attach(city,decision){const f=fixture(city);if(!decision||typeof decision!=='object')throw new Error('decision-object-required');decision.municipalEvidence={schema:'VIDIK.MunicipalEvidence.v1',city:f.city,jurisdiction:f.jurisdiction,source:f.source,normalizedEvidence:f.evidence};decision.municipalOutcomePlan={schema:'VIDIK.MunicipalOutcomeValidation.v1',mode:f.outcome.mode,metric:f.outcome.metric,unit:f.outcome.unit,sourceAnchor:f.outcome.sourceAnchor,checkpoints:f.outcome.checkpoints};return f;}
  root.VIDIK_MUNICIPAL_LIFECYCLE_10=Object.freeze({version:'10.0.0-validation',cities:Object.keys(FIXTURES),fixture,attach});
})(typeof window!=='undefined'?window:globalThis);
if(typeof module!=='undefined')module.exports=globalThis.VIDIK_MUNICIPAL_LIFECYCLE_10;
