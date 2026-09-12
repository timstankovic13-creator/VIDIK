'use strict';
(function(){
  const VERSION='9.7.1';
  const STATE=()=>window.VIDIK_92_INTEGRATION||null;
  function snapshot(){
    const state=STATE();
    if(!state)return {version:VERSION,status:'BLOCKED',reason:'canonical-decision-state-unavailable'};
    const result={version:VERSION,status:state.status||'UNKNOWN',source:'VIDIK_92_INTEGRATION',revision:state.revision||0,decision:state.decision||null,sensitivity:state.sensitivity||null,voi:state.voi||null,counterfactual:state.counterfactual||null,lineageHash:state.lastEvidenceHash||null,calibration:state.calibration||null};
    result.integrityHash=stableHash(result);
    return result;
  }
  function stable(value){
    if(Array.isArray(value))return '['+value.map(stable).join(',')+']';
    if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
    return JSON.stringify(value);
  }
  function stableHash(value){
    const text=stable(value);
    let h=2166136261;
    for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
    return (h>>>0).toString(16).padStart(8,'0');
  }
  function render(result){
    for(const host of [document.getElementById('uncertainty')?.parentElement,document.getElementById('voi')?.parentElement]){
      host?.querySelectorAll('[data-vidik-di97]')?.forEach(node=>node.remove());
    }
    const uncertaintyHost=document.getElementById('uncertainty')?.parentElement;
    const voiHost=document.getElementById('voi')?.parentElement;
    if(uncertaintyHost){
      const el=document.createElement('pre');
      el.dataset.vidikDi97='';
      el.setAttribute('aria-label','VIDIK 9.7.1 canonical decision intelligence');
      el.textContent='9.7.1 · canonical Step 5 state\n'+JSON.stringify({status:result.status,revision:result.revision,decision:result.decision,sensitivity:result.sensitivity,counterfactual:result.counterfactual},null,2);
      uncertaintyHost.appendChild(el);
    }
    if(voiHost){
      const el=document.createElement('pre');
      el.dataset.vidikDi97='';
      el.setAttribute('aria-label','VIDIK 9.7.1 canonical value-of-information');
      el.textContent='9.7.1 · canonical value-of-information state\n'+JSON.stringify(result.voi,null,2);
      voiHost.appendChild(el);
    }
  }
  function expose(){
    Object.defineProperty(window,'VIDIK_DECISION_INTELLIGENCE_9_7_BROWSER',{configurable:true,enumerable:true,get:snapshot,set:()=>{}});
    return snapshot();
  }
  async function initialize(){
    for(let attempt=0;attempt<120;attempt++){
      const state=STATE();
      if(state){
        const result=expose();
        render(result);
        return result;
      }
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    return expose();
  }
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();