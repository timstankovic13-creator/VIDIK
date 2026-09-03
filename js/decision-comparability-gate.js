'use strict';
(function(){
  if(typeof candidateGate!=='function') return;
  const baseCandidateGate=candidateGate;
  function comparableGate(c){
    const result=baseCandidateGate(c);
    const expected=window.V?.objective?.metricId;
    const actual=c?.params?.effect?.metricId;
    if(!expected) result.failures.push('missing-common-outcome-definition');
    else if(actual!==expected) result.failures.push('effect:not-mapped-to-common-outcome');
    result.failures=[...new Set(result.failures)];
    result.pass=result.failures.length===0;
    return result;
  }
  candidateGate=comparableGate;
  window.VIDIKComparability={version:'1.0',metricId:()=>window.V?.objective?.metricId||null,gate:comparableGate};
})();
