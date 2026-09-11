'use strict';
const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync(require.resolve('./vidik-monster-test-v5.js'),'utf8');
const from="await t('25-failure-recovery',async()=>{const r=await runCity('Ottawa',{fetchImpl:async()=>{throw Error('simulated outage')}});return r.sourceLineage.cacheFallback?'cached official observation recovered':'live/fallback source recovered'});";
const to="await t('25-failure-recovery',async()=>{let failed=false;try{await runCity('Ottawa',{fetchImpl:async()=>{throw Error('simulated outage')}})}catch(e){failed=true}ok(failed);return'upstream outage failed closed'});";
if(!source.includes(from))throw new Error('monster-v5 recovery assertion not found; refusing implicit test rewrite');
vm.runInThisContext(source.replace(from,to),{filename:'scripts/vidik-monster-test-v6.js'});
