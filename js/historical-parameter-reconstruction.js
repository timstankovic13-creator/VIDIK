'use strict';
(function(){
  const STATUS={OBSERVED:'observed',DERIVED:'derived',ESTIMATED:'estimated',ASSUMED:'assumed',MISSING:'missing'};
  const TYPES=['need','baseline','effect','capacity','feasibility','cost','timeHorizon'];
  const REQUIRED_METADATA=['unit','denominator','geography','population','measurementPeriod','uncertainty'];

  function validDate(date){return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date);}
  function beforeBoundary(date,boundary){return validDate(date)&&validDate(boundary)&&date<=boundary;}

  function sourceIsAdmissible(source,boundary){
    return !!source && source.admissibleAtBoundary===true && source.publicationDateVerified===true && beforeBoundary(source.publishedAt,boundary);
  }

  function claimIsUsable(claim){
    return !!claim && typeof claim.id==='string' && claim.id.length>0;
  }

  function metadataComplete(parameter){
    return REQUIRED_METADATA.every(k=>parameter[k]!==null&&parameter[k]!==undefined&&parameter[k]!=='');
  }

  function normalizeParameter(rule,sourceIds,claimIds){
    const parameter={
      parameterType:rule.parameterType,
      status:rule.status||STATUS.DERIVED,
      value:rule.value??null,
      unit:rule.unit??null,
      denominator:rule.denominator??null,
      geography:rule.geography??null,
      population:rule.population??null,
      measurementPeriod:rule.measurementPeriod??null,
      uncertainty:rule.uncertainty??null,
      sourceIds:[...new Set(sourceIds)],
      claimIds:[...new Set(claimIds)],
      evidenceQuality:rule.evidenceQuality||'unrated',
      causalIdentification:rule.causalIdentification||'not-assessed',
      transportability:rule.transportability??null,
      candidateSpecific:rule.candidateSpecific===true,
      method:rule.method||'explicit reconstruction rule',
      reason:rule.reason||null
    };
    return parameter;
  }

  function reconstruct({boundary,sources,claimsBySource={},candidateId,claimRules=[],marginalMap=null}){
    const out=[];
    for(const type of TYPES){
      const rule=claimRules.find(r=>r.parameterType===type);
      if(!rule){
        out.push(normalizeParameter({parameterType:type,status:STATUS.MISSING,reason:'no reconstruction rule'},[],[]));
        continue;
      }
      const sourceIds=[]; const claimIds=[]; const usableClaims=[];
      for(const id of rule.sourceIds||[]){
        const s=sources?.[id];
        if(!sourceIsAdmissible(s,boundary))continue;
        for(const c of (claimsBySource[id]||s.claims||[])){
          if(rule.claimType&&c.type!==rule.claimType)continue;
          if(!claimIsUsable(c))continue;
          sourceIds.push(id); claimIds.push(c.id); usableClaims.push(c);
        }
      }
      if(!sourceIds.length){
        out.push(normalizeParameter({parameterType:type,status:STATUS.MISSING,reason:'no admissible source-backed claim'},[],[]));
        continue;
      }
      const normalized=normalizeParameter(rule,sourceIds,claimIds);
      if(rule.value==null){
        normalized.status=STATUS.MISSING;
        normalized.reason=rule.method||'claim exists but normalization rule does not establish a defensible value';
      }else if(!metadataComplete(normalized)){
        normalized.status=STATUS.MISSING;
        normalized.reason='normalized value lacks required denominator, geography, population, measurement period, unit, or uncertainty metadata';
      }
      if(normalized.status===STATUS.ASSUMED && rule.assumptionJustification!=='explicitly-labeled-and-reviewed'){
        normalized.status=STATUS.MISSING;
        normalized.reason='assumption laundering gate: assumed parameter lacks explicit review marker';
      }
      if(rule.requiresCausalGate===true && normalized.causalIdentification==='not-assessed'){
        normalized.status=STATUS.MISSING;
        normalized.reason='causal-identification gate not satisfied';
      }
      if(rule.requiresTransportability===true && normalized.transportability===null){
        normalized.status=STATUS.MISSING;
        normalized.reason='transportability gate not satisfied';
      }
      if(rule.requiresCandidateSpecific===true && normalized.candidateSpecific!==true){
        normalized.status=STATUS.MISSING;
        normalized.reason='candidate-specific parameter required; contextual evidence cannot be substituted';
      }
      normalized.claimCount=usableClaims.length;
      out.push(normalized);
    }

    let marginalization={status:STATUS.MISSING,resourceUnit:null,resourceAmount:null,capacityUnit:null,capacityValue:null,outcomeUnit:null,outcomeValue:null,sourceIds:[],claimIds:[],reason:'no defensible marginal resource-to-outcome mapping'};
    if(marginalMap){
      const sourceIds=(marginalMap.sourceIds||[]).filter(id=>sourceIsAdmissible(sources?.[id],boundary));
      const claimIds=[];
      for(const id of sourceIds){for(const c of (claimsBySource[id]||sources[id].claims||[])){if(claimIsUsable(c))claimIds.push(c.id);}}
      const complete=[marginalMap.resourceUnit,marginalMap.resourceAmount,marginalMap.capacityUnit,marginalMap.capacityValue,marginalMap.outcomeUnit,marginalMap.outcomeValue].every(v=>v!==null&&v!==undefined&&v!=='');
      if(complete&&sourceIds.length&&marginalMap.causalGate==='passed'&&marginalMap.transportabilityGate==='passed'){
        marginalization={...marginalMap,status:STATUS.DERIVED,sourceIds:[...new Set(sourceIds)],claimIds:[...new Set(claimIds)]};
      }else{
        marginalization={...marginalMap,status:STATUS.MISSING,sourceIds:[...new Set(sourceIds)],claimIds:[...new Set(claimIds)],reason:'marginal mapping requires complete resource/capacity/outcome values plus causal and transportability gates'};
      }
    }

    const blocked=out.some(p=>p.status===STATUS.MISSING)||marginalization.status===STATUS.MISSING;
    const provenanceComplete=out.every(p=>p.status===STATUS.MISSING||p.sourceIds.length>0&&p.claimIds.length>0)&&marginalization.sourceIds.every(id=>sourceIsAdmissible(sources?.[id],boundary));
    return {boundary,candidateId,parameters:out,marginalization,blocked,provenanceComplete};
  }

  function admissibility(source,boundary){
    if(!source)return {admissible:false,reason:'missing source'};
    if(source.publicationDateVerified!==true)return {admissible:false,reason:'publication date not verified'};
    if(!beforeBoundary(source.publishedAt,boundary))return {admissible:false,reason:'published after historical boundary'};
    return {admissible:true,reason:'historically admissible'};
  }

  window.VIDIK_HistoricalParameters={STATUS,TYPES,REQUIRED_METADATA,admissibility,reconstruct};
})();
