// Fail-closed UI validation for numeric decision inputs.
(function(){
  function validate(){
    const pool=document.getElementById('pool');
    const risk=document.getElementById('risk');
    if(!pool||!risk)return true;
    const p=Number(pool.value), r=Number(risk.value);
    const invalid=!Number.isFinite(p)||p<0||!Number.isFinite(r)||r<0||r>1;
    const gate=document.getElementById('gate');
    const rec=document.getElementById('recommendation');
    const rr=document.getElementById('rec');
    if(invalid){
      pool.setCustomValidity(Number.isFinite(p)&&p<0?'Resource pool cannot be negative.':'');
      risk.setCustomValidity(Number.isFinite(r)&&(r<0||r>1)?'Risk ceiling must be between 0 and 1.':'');
      pool.setAttribute('aria-invalid',String(!Number.isFinite(p)||p<0));
      risk.setAttribute('aria-invalid',String(!Number.isFinite(r)||r<0||r>1));
      if(gate){gate.textContent='BLOCKED — invalid numeric input';gate.className='status fail';}
      if(rec){rec.textContent='NO RECOMMENDATION';rec.className='status fail';}
      if(rr)rr.textContent='NO RECOMMENDATION';
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
