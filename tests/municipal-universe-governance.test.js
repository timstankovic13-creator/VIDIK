'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const U=fs.readFileSync(path.join(__dirname,'../js/intervention-universe.js'),'utf8');const P=fs.readFileSync(path.join(__dirname,'../js/vidik-platform-10.js'),'utf8');const G=fs.readFileSync(path.join(__dirname,'../js/municipal-universe-governance.js'),'utf8');
const store=new Map(),listeners=[];const context={console,Date,Math,JSON,Number,String,Object,Array,setTimeout:(fn)=>{listeners.push(fn)},window:{localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}}};vm.createContext(context);vm.runInContext(U,context);vm.runInContext(P,context);vm.runInContext(G,context);while(listeners.length){const fn=listeners.shift();fn();if(listeners.length>2)break;}
const GAPI=context.window.VIDIK_PLATFORM_10;assert.equal(GAPI.UNIVERSE_CONTRACT?.verificationRegistry,true);
const crime=GAPI.discoverMunicipalUniverse('Minimize violent crime','Ottawa');assert.ok(crime.items.length>=25);assert.equal(crime.coverage.complete,false);assert.equal(crime.coverage.verifiedCount,0);
const hot=crime.items.find(x=>x.id==='ps-hotspots');assert.ok(hot);
assert.equal(GAPI.verifyMunicipalIntervention({problem:'Minimize violent crime',universeId:hot.id,evidenceIds:['review:hotspots'],cost:100000,capacity:10,expectedValue:5,objectiveMetric:'violent-crime-rate'}).ok,true);
const after=GAPI.discoverMunicipalUniverse('Minimize violent crime','Ottawa');assert.equal(after.coverage.verifiedCount,1);assert.equal(after.coverage.complete,false);
assert.equal(GAPI.verifyMunicipalIntervention({problem:'Minimize violent crime',universeId:hot.id,evidenceIds:[],cost:1,capacity:1,expectedValue:1,objectiveMetric:'violent-crime-rate'}).code,'EVIDENCE_REQUIRED');
assert.equal(GAPI.verifyMunicipalIntervention({problem:'Minimize violent crime',universeId:'does-not-exist',evidenceIds:['e'],cost:1,capacity:1,expectedValue:1,objectiveMetric:'x'}).code,'UNKNOWN_UNIVERSE_ITEM');
GAPI.clearMunicipalInterventionVerification(hot.id);
console.log('VIDIK municipal universe governance: PASS — discovery, explicit verification and fail-closed coverage');
