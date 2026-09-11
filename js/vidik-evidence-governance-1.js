'use strict';
(function(w){
  const finite=n=>Number.isFinite(Number(n));
  const country=s=>{const v=String(s||'').trim().toUpperCase();if(!v)return null;if(v==='CANADA'||v==='CA'||v.startsWith('CA-'))return 'CA';if(v==='AUSTRALIA'||v==='AU'||v.startsWith('AU-'))return 'AU';return v.split(/[,\s-]+/)[0]||null;};
  function transportabilityScore(source,target,explicit){
    if(explicit!=null){const n=Number(explicit);return finite(n)&&n>=0&&n<=1?n:null;}
    if(!source||!target)return null;
    const s=String(source).trim().toUpperCase(),t=String(target).trim().toUpperCase();
    if(s===t)return 1;
    if(country(s)===country(t))return .8;
    return 0;
  }
  function assessEvidence(input={}){
    const failures=[];
    const quality=Number(input.quality??input.evidenceQuality);
    if(!finite(quality)||quality<Number(input.minQuality??.75))failures.push('evidence-quality-below-production-threshold');
    const score=transportabilityScore(input.sourceJurisdiction,input.targetJurisdiction,input.transportability?.similarity);
    if(score==null)failures.push('transportability-score-missing');
    else if(score<Number(input.minTransportability??.8))failures.push('transportability-below-production-threshold');
    const maxAge=Number(input.maxAgeDays??1095);
    if(!input.freshnessDate)failures.push('freshness-date-missing');
    else {const age=(Date.parse(input.now||new Date().toISOString())-Date.parse(input.freshnessDate))/86400000;if(!finite(age)||age<0)failures.push('freshness-date-invalid');else if(age>maxAge)failures.push('evidence-stale');}
    if(input.requiredUnit!=null&&String(input.unit||'')!==String(input.requiredUnit))failures.push('unit-mismatch');
    if(!input.id)failures.push('evidence-id-missing');
    return {admissible:failures.length===0,failures,transportabilityScore:score,quality:finite(quality)?quality:null};
  }
  function validateEvidenceSet(items=[]){
    if(!Array.isArray(items)||!items.length)return {ok:false,code:'NO_EVIDENCE'};
    const ids=items.map(x=>x&&x.id).filter(Boolean);if(ids.length!==items.length)return {ok:false,code:'EVIDENCE_ID_MISSING'};
    const duplicates=ids.filter((id,i)=>ids.indexOf(id)!==i);if(duplicates.length)return {ok:false,code:'DUPLICATE_EVIDENCE',duplicates:[...new Set(duplicates)]};
    return {ok:true,count:items.length,ids};
  }
  w.VIDIK_EVIDENCE_GOVERNANCE_1={VERSION:'1.0.0',transportabilityScore,assessEvidence,validateEvidenceSet,PRODUCTION_MIN_QUALITY:.75,PRODUCTION_MIN_TRANSPORTABILITY:.8,DEFAULT_MAX_AGE_DAYS:1095};
})(typeof window!=='undefined'?window:globalThis);
