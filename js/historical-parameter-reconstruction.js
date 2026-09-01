'use strict';
(function(){
  const STATUS={OBSERVED:'observed',DERIVED:'derived',ESTIMATED:'estimated',ASSUMED:'assumed',MISSING:'missing'};
  const TYPES=['need','baseline','effect','capacity','feasibility','cost','timeHorizon'];
  function beforeBoundary(date,boundary){return typeof date==='string'&&/^\\d{4}-\\d{2}-\\d{2}$/.test(date)&&date<=boundary}
  function reconstruct({boundary,sources,claimsBySource={},candidateId,claimRules=[]}){
    const out=[];
    for(const type of TYPES){
      const rule=claimRules.find(r=>r.parameterType===type);
      if(!rule){out.push({candidateId,parameterType:type,status:STATUS.MISSING,value:null,unit:null,sourceIds:[],claimIds:[],reason:'no reconstruction rule'});continue}
      const sourceIds=[]; const claimIds=[];
      for(const id of rule.sourceIds||[]){
        const s=sources?.[id];
        if(!s||s.admissibleAtBoundary!==true||!beforeBoundary(s.publishedAt,boundary))continue;
        for(const c of (claimsBySource[id]||s.claims||[])){
          if(rule.claimType&&c.type!==rule.claimType)continue;
          sourceIds.push(id); claimIds.push(c.id||`${id}:${claimIds.length+1}`);
        }
      }
      if(!sourceIds.length){out.push({candidateId,parameterType:type,status:STATUS.MISSING,value:null,unit:null,sourceIds:[],claimIds:[],reason:'no admissible source-backed claim'});continue}
      if(rule.value==null){out.push({candidateId,parameterType:type,status:STATUS.MISSING,value:null,unit:rule.unit||null,sourceIds:[...new Set(sourceIds)],claimIds:[...new Set(claimIds)],reason:'claim exists but normalization rule does not establish a defensible value'});continue}
      out.push({candidateId,parameterType:type,status:rule.status||STATUS.DERIVED,value:rule.value,unit:rule.unit||null,sourceIds:[...new Set(sourceIds)],claimIds:[...new Set(claimIds)],evidenceQuality:rule.evidenceQuality||'unrated',causalIdentification:rule.causalIdentification||'not-assessed',transportability:rule.transportability??null,uncertainty:rule.uncertainty||null,method:rule.method||'explicit reconstruction rule'});
    }
    return {boundary,candidateId,parameters:out,blocked:out.some(p=>p.status===STATUS.MISSING),provenanceComplete:out.every(p=>p.status===STATUS.MISSING||p.sourceIds.length>0&&p.claimIds.length>0)};
  }
  function admissibility(source,boundary){
    if(!source)return {admissible:false,reason:'missing source'};
    if(source.publicationDateVerified!==true)return {admissible:false,reason:'publication date not verified'};
    if(!beforeBoundary(source.publishedAt,boundary))return {admissible:false,reason:'published after historical boundary'};
    return {admissible:true,reason:'historically admissible'};
  }
  window.VIDIK_HistoricalParameters={STATUS,admissibility,reconstruct};
})();
