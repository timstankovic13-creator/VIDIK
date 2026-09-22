'use strict';
(function(root){
  // Semantic contract: municipal source fields are observations/context. They are
  // never treated as causal effects. Every field declares unit, aggregation,
  // decision role, and whether it is admissible for optimization.
  const SOURCES = Object.freeze({
    Ottawa: Object.freeze({
      dataset: 'ottawa-housing-2024',
      sourceType: 'municipal-report',
      measure: Object.freeze({ field: 'individuals_housed', unit: 'people', aggregation: 'reported_total', role: 'observed_context', parameter: 'housing.need' }),
      causalEvidence: Object.freeze({ id: 'housing-rct', mode: 'transported', jurisdiction: 'Canada', admissible: true, rationale: 'Canadian randomized Housing First evidence; local Ottawa source supplies context, not the effect estimate.' })
    }),
    Toronto: Object.freeze({
      dataset: 'toronto-tsss-2024',
      sourceType: 'municipal-annual-report',
      measure: Object.freeze({ field: 'people_moved_to_permanent_housing', unit: 'people', aggregation: 'reported_total', role: 'observed_context', parameter: 'housing.need' }),
      causalEvidence: Object.freeze({ id: 'housing-rct', mode: 'transported', jurisdiction: 'Canada', admissible: true, rationale: 'Canadian randomized Housing First evidence; local Toronto source supplies context, not the effect estimate.' })
    }),
    Melbourne: Object.freeze({
      dataset: 'melbourne-make-room-2024',
      sourceType: 'municipal-program-report',
      measure: Object.freeze({ field: 'people_experiencing_chronic_homelessness_or_rough_sleeping', unit: 'people', aggregation: 'reported_point_in_time', role: 'observed_context', parameter: 'housing.need' }),
      causalEvidence: Object.freeze({ id: 'housing-rct', mode: 'cross-country', jurisdiction: 'Canada', admissible: false, rationale: 'No explicit Australia/Melbourne transportability evidence is registered for this causal estimate.' })
    })
  });

  const PARAMETER_BINDINGS = Object.freeze({
    housing: Object.freeze({
      need: Object.freeze({ semantic: 'municipal observed context', role: 'optimization input', causal: false }),
      effect: Object.freeze({ semantic: 'causal effect estimate', role: 'optimization input', causal: true }),
      capacity: Object.freeze({ semantic: 'implementation capacity', role: 'optimization input', causal: false }),
      feasibility: Object.freeze({ semantic: 'implementation/legal constraint', role: 'optimization input', causal: false }),
      equity: Object.freeze({ semantic: 'normative policy weight', role: 'user preference', causal: false })
    }),
    ase: Object.freeze({
      need: Object.freeze({ semantic: 'municipal observed road-safety context', role: 'optimization input', causal: false }),
      effect: Object.freeze({ semantic: 'causal/intermediate effect estimate', role: 'optimization input', causal: true }),
      capacity: Object.freeze({ semantic: 'implementation capacity', role: 'optimization input', causal: false }),
      feasibility: Object.freeze({ semantic: 'legal/operational constraint', role: 'optimization input', causal: false }),
      equity: Object.freeze({ semantic: 'normative policy weight', role: 'user preference', causal: false })
    })
  });

  function citySpec(city){ const s=SOURCES[city]; if(!s) throw new Error('unsupported-municipality'); return s; }
  function observationBinding(city, candidateId, parameterId){
    const s=citySpec(city);
    if(candidateId==='housing' && parameterId==='need') return { ...s.measure, dataset:s.dataset, sourceType:s.sourceType, city };
    return null;
  }
  function admissibility(city, candidate){
    const s=citySpec(city);
    const failures=[];
    if(candidate.id==='housing'){
      if(!s.causalEvidence.admissible) failures.push('causal-effect-not-transportable-to-city');
      if(candidate.params?.effect?.causal!==true) failures.push('effect-not-causally-identified');
      if(!(candidate.params?.effect?.evidenceIds||[]).includes(s.causalEvidence.id)) failures.push('effect-evidence-not-registered-for-city');
      return { admissible: failures.length===0, failures, city, candidateId:candidate.id, observation:observationBinding(city,'housing','need'), causalEvidence:s.causalEvidence };
    }
    if(candidate.id==='ase'){
      // The current candidate's legal constraint is Ottawa-specific. Do not reuse
      // it for another municipality; require a city-specific admissibility record.
      failures.push('city-specific-ase-admissibility-evidence-missing');
      return { admissible:false, failures, city, candidateId:candidate.id, observation:null, causalEvidence:null };
    }
    failures.push('no-city-specific-semantic-mapping');
    return { admissible:false, failures, city, candidateId:candidate.id, observation:null, causalEvidence:null };
  }
  function decisionParameters(city, candidate){
    const a=admissibility(city,candidate);
    const binding=PARAMETER_BINDINGS[candidate.id];
    return { city, candidateId:candidate.id, admissibility:a, bindings:binding||null };
  }
  root.VIDIK_MUNICIPAL_DECISION_MAPPING=Object.freeze({version:'1.0.0',cities:Object.keys(SOURCES),sources:SOURCES,parameterBindings:PARAMETER_BINDINGS,citySpec,observationBinding,admissibility,decisionParameters});
})(typeof window!=='undefined'?window:globalThis);
if(typeof module!=='undefined') module.exports=globalThis.VIDIK_MUNICIPAL_DECISION_MAPPING;
