'use strict';
// Fail-closed UI validation for numeric decision inputs.
(function(){
  function validate(){
    const pool=document.getElementById('pool');
    const risk=document.getElementById('risk');
    if(!pool||!risk)return true;
    const pRaw=pool.value, rRaw=risk.value;
    const p=Number(pRaw), r=Number(rRaw);
    // Number('') is 0, so inspect the raw control value as well. A browser
    // number input sanitizes hostile non-numeric assignments to an empty value.
    const pInvalid=pRaw.trim()===''||!Number.isFinite(p)||p<0;
    const rInvalid=rRaw.trim()===''||!Number.isFinite(r)||r<0||r>1;
    const invalid=pInvalid||rInvalid;
    const gate=document.getElementById('gate');
    const rec=document.getElementById('recommendation');
    const rr=document.getElementById('rec');
    const admissible=document.getElementById('admissible');
    const lineage=document.getElementById('lineage');
    const candidates=document.getElementById('candidates');
    const why=document.getElementById('why');
    const audit=document.getElementById('audit');
    if(invalid){
      pool.setCustomValidity(pInvalid?(pRaw.trim()===''?'Resource pool must be a finite number.':'Resource pool cannot be negative.'):'');
      risk.setCustomValidity(rInvalid?(rRaw.trim()===''?'Risk ceiling must be a finite number.':'Risk ceiling must be between 0 and 1.'):'');
      pool.setAttribute('aria-invalid',String(pInvalid));
      risk.setAttribute('aria-invalid',String(rInvalid));
      if(gate){gate.textContent='BLOCKED — invalid numeric input';gate.className='status fail';}
      if(rec){rec.textContent='NO RECOMMENDATION';rec.className='status fail';}
      if(rr)rr.textContent='NO RECOMMENDATION';
      if(admissible)admissible.textContent='0';
      if(lineage)lineage.textContent='0/'+(window.C?.length||0);
      if(candidates)candidates.innerHTML='';
      if(why)why.textContent='No decision is admissible because the current numeric inputs are invalid.';
      if(audit)audit.textContent=JSON.stringify({version:window.V?.version||null,city:document.getElementById('city')?.value||null,pool:pRaw,risk:rRaw,recommendation:null,admissible:[],blocked:true,reason:'invalid-numeric-input',timestamp:new Date().toISOString()},null,2);
    }else{
      pool.setCustomValidity('');risk.setCustomValidity('');
      pool.removeAttribute('aria-invalid');risk.removeAttribute('aria-invalid');
    }
    return !invalid;
  }
  window.VIDIKValidateInputs=validate;
  document.addEventListener('input',validate,true);
  document.addEventListener('change',validate,true);
})();
