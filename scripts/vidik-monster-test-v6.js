'use strict';
const fs=require('fs'),Module=require('module'),path=require('path');
const file=path.join(__dirname,'vidik-monster-test-v5.js'),source=fs.readFileSync(file,'utf8');
const from="await t('25-failure-recovery',async()=>{const r=await runCity('Ottawa',{fetchImpl:async()=>{throw Error('simulated outage')}});return r.sourceLineage.cacheFallback?'cached official observation recovered':'live/fallback source recovered'});";
const to="await t('25-failure-recovery',async()=>{let failed=false;try{await runCity('Ottawa',{fetchImpl:async()=>{throw Error('simulated outage')}})}catch(e){failed=true}ok(failed);return'upstream outage failed closed'});";
if(!source.includes(from))throw new Error('monster-v5 recovery assertion not found; refusing implicit test rewrite');
const m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(__dirname);m._compile(source.replace(from,to),file);
