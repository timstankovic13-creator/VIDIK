'use strict';
(function(){
  window.runTests=function(){
    const R=[],t=(n,f)=>{try{f();R.push(['PASS',n])}catch(e){R.push(['FAIL',n,e.message])}};
    t('common outcome definition exists',()=>{if(!window.V?.objective?.metricId)throw Error('missing metric definition')});
    t('housing is not falsely mapped',()=>{if(C.find(c=>c.id==='housing').params.effect.metricId===window.V.objective.metricId)throw Error('unsupported mapping')});
    t('ASE is not falsely mapped',()=>{if(C.find(c=>c.id==='ase').params.effect.metricId===window.V.objective.metricId)throw Error('unsupported mapping')});
    t('incomparable candidates are blocked',()=>{if(window.VIDIKComparability.gate(C.find(c=>c.id==='housing')).pass)throw Error('housing admitted without common outcome mapping')});
    t('paramedic without causal effect remains blocked',()=>{if(candidateGate(C.find(c=>c.id==='paramedic')).pass)throw Error('paramedic admitted')});
    t('non-finite values are rejected',()=>{if([NaN,Infinity,-Infinity].some(Number.isFinite))throw Error('non-finite value accepted')});
    t('HTTPS evidence URLs',()=>Object.values(E).filter(e=>e?.id).forEach(e=>{if(!safeURL(e.url))throw Error(e.id)}));
    t('retrieval dates',()=>Object.values(E).filter(e=>e?.id).forEach(e=>{if(!dateOK(e.retrievedAt))throw Error(e.id)}));
    t('typed claims',()=>Object.values(E).filter(e=>e?.id).forEach(e=>{if(!e.claims?.length)throw Error(e.id)}));
    t('unsafe URL rejected',()=>{if(safeURL('javascript:alert(1)'))throw Error('unsafe URL accepted')});
    t('stale evidence rejected',()=>{const old=E.__stale;E.__stale={id:'__stale',sourceType:'test',url:'https://example.com',retrievedAt:'2020-01-01',status:'verified',transportability:1,claims:[{type:'x',text:'x'}]};try{if(evidenceGate('__stale').pass)throw Error('stale evidence admitted')}finally{old?E.__stale=old:delete E.__stale}});
    t('XSS escaping',()=>{if(hEsc('<img src=x>').includes('<img'))throw Error('unescaped')});
    t('stable city identity',()=>{if(stableCityId('Ottawa','Canada')!=='wup25-canada-ottawa')throw Error('city-id')});
    t('dataset snapshot completeness',()=>{const s=decisionDatasetSnapshot('Ottawa','Canada');if(s.census.expected_records!==12138||!s.evidence.version||!s.city.city_id)throw Error('snapshot')});
    t('input guard fails closed when controls missing',()=>{const p=document.getElementById('pool'),r=document.getElementById('risk');p.remove();r.remove();try{if(window.VIDIKValidateInputs())throw Error('missing controls accepted')}finally{document.querySelector('main')?.querySelector('.controls')?.append(p,r)}});
    const all=R.every(x=>x[0]==='PASS');const el=document.getElementById('tests');if(el){el.textContent=(all?'PASS — ':'FAIL — ')+R.filter(x=>x[0]==='PASS').length+'/'+R.length;el.className='status '+(all?'pass':'fail')}const log=document.getElementById('testlog');if(log)log.textContent=R.map(x=>x[0]+' '+x[1]+(x[2]?' — '+x[2]:'')).join('\n');return R;
  };
})();
