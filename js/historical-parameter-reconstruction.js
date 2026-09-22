'use strict';
(function(){
  const STATUS={OBSERVED:'observed',DERIVED:'derived',ESTIMATED:'estimated',ASSUMED:'assumed',MISSING:'missing'};
  const TYPES=['need','baseline','effect','capacity','feasibility','cost','timeHorizon'];
  const REQUIRED_METADATA=['unit','denominator','geography','population','measurementPeriod','uncertainty'];
  const MARGINAL_REQUIRED=['resourceUnit','resourceAmount','capacityUnit','capacityValue','outcomeUnit','outcomeValue','measurementPeriod','denominator','geography','population','uncertainty'];

  function validDate(date){return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date);}
  function beforeBoundary(date,boundary){return validDate(date)&&validDate(boundary)&&date<=boundary;}
  function sourceIsAdmissible(source,boundary){
    return !!source && source.admissibleAtBoundary===true && source.publicationDateVerified===true && beforeBoundary(source.publishedAt,boundary);
  }
  function claimIsUsable(claim){return !!claim && typeof claim.id==='string' && claim.id.length>0;}
  function metadataComplete(parameter){return REQUIRED_METADATA.every(k=>parameter[k]!==null&&parameter[k]!==undefined&&parameter[k]!=='');}

  function normalizeParameter(rule,sourceIds,claimIds){
    return {
      parameterType:rule.parameterType,status:rule.status||STATUS.DERIVED,value:rule.value??null,
      unit:rule.unit??null,denominator:rule.denominator??null,geography:rule.geography??null,
      population:rule.population??null,measurementPeriod:rule.measurementPeriod??null,
      uncertainty:rule.uncertainty??null,sourceIds:[...new Set(sourceIds)],claimIds:[...new Set(claimIds)],
      evidenceQuality:rule.evidenceQuality||'unrated',causalIdentification:rule.causalIdentification||'not-assessed',
      transportability:rule.transportability??null,candidateSpecific:rule.candidateSpecific===true,
      method:rule.method||'explicit reconstruction rule',reason:rule.reason||null
    };
  }

  function normalizeMarginalMap(map,sourceIds,claimIds){
    const out={
      resourceUnit:map?.resourceUnit??null,resourceAmount:map?.resourceAmount??null,
      capacityUnit:map?.capacityUnit??null,capacityValue:map?.capacityValue??null,
      outcomeUnit:map?.outcomeUnit??null,outcomeValue:map?.outcomeValue??null,
      measurementPeriod:map?.measurementPeriod??null,denominator:map?.denominator??null,
      geography:map?.geography??null,population:map?.population??null,uncertainty:map?.uncertainty??null,
      mechanism:map?.mechanism??null,sourceIds:[...new Set(sourceIds)],claimIds:[...new Set(claimIds)],
      causalGate:map?.causalGate??'not-passed',transportabilityGate:map?.transportabilityGate??'not-passed',
      candidateSpecific:map?.candidateSpecific===true,status:STATUS.MISSING,
      reason:'marginal resource-to-capacity-to-outcome mapping is incomplete'
    };
    const complete=MARGINAL_REQUIRED.every(k=>out[k]!==null&&out[k]!==undefined&&out[k]!=='');
    if(complete&&out.mechanism&&out.causalGate==='passed'&&out.transportabilityGate==='passed'&&out.candidateSpecific===true&&out.sourceIds.length&&out.claimIds.length){
      out.status=STATUS.DERIVED; out.reason=null;
    } else if(out.causalGate!=='passed') out.reason='marginal mapping requires a passed causal-identification gate';
    else if(out.transportabilityGate!=='passed') out.reason='marginal mapping requires a passed transportability gate';
    else if(out.candidateSpecific!==true) out.reason='marginal mapping must be candidate-specific';
    return out;
  }

  function reconstruct({boundary,sources,claimsBySource={},candidateId,claimRules=[],marginalMap=null}){
    const out=[];
    for(const type of TYPES){
      const rule=claimRules.find(r=>r.parameterType===type);
      if(!rule){out.push(normalizeParameter({parameterType:type,status:STATUS.MISSING,reason:'no reconstruction rule'},[],[]));continue;}
      const sourceIds=[]; const claimIds=[]; const usableClaims=[];
      for(const id of rule.sourceIds||[]){
        const s=sources?.[id]; if(!sourceIsAdmissible(s,boundary))continue;
        for(const c of (claimsBySource[id]||s.claims||[])){if(rule.claimType&&c.type!==rule.claimType)continue;if(!claimIsUsable(c))continue;sourceIds.push(id);claimIds.push(c.id);usableClaims.push(c);}
      }
      if(!sourceIds.length){out.push(normalizeParameter({parameterType:type,status:STATUS.MISSING,reason:'no admissible source-backed claim'},[],[]));continue;}
      const normalized=normalizeParameter(rule,sourceIds,claimIds);
      if(rule.value==null){normalized.status=STATUS.MISSING;normalized.reason=rule.method||'claim exists but normalization rule does not establish a defensible value';}
      else if(!metadataComplete(normalized)){normalized.status=STATUS.MISSING;normalized.reason='normalized value lacks required denominator, geography, population, measurement period, unit, or uncertainty metadata';}
      if(normalized.status===STATUS.ASSUMED&&rule.assumptionJustification!=='explicitly-labeled-and-reviewed'){normalized.status=STATUS.MISSING;normalized.reason='assumption laundering gate: assumed parameter lacks explicit review marker';}
      if(rule.requiresCausalGate===true&&normalized.causalIdentification==='not-assessed'){normalized.status=STATUS.MISSING;normalized.reason='causal-identification gate not satisfied';}
      if(rule.requiresTransportability===true&&normalized.transportability===null){normalized.status=STATUS.MISSING;normalized.reason='transportability gate not satisfied';}
      if(rule.requiresCandidateSpecific===true&&normalized.candidateSpecific!==true){normalized.status=STATUS.MISSING;normalized.reason='candidate-specific parameter required; contextual evidence cannot be substituted';}
      normalized.claimCount=usableClaims.length; out.push(normalized);
    }

    const marginalSourceIds=(marginalMap?.sourceIds||[]).filter(id=>sourceIsAdmissible(sources?.[id],boundary));
    const marginalClaimIds=[];
    for(const id of marginalSourceIds){for(const c of (claimsBySource[id]||sources[id].claims||[])){if(claimIsUsable(c))marginalClaimIds.push(c.id);}}
    const marginalization=normalizeMarginalMap(marginalMap||{},marginalSourceIds,marginalClaimIds);
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

  window.VIDIK_HistoricalParameters={STATUS,TYPES,REQUIRED_METADATA,MARGINAL_REQUIRED,admissibility,normalizeMarginalMap,reconstruct};
})();
