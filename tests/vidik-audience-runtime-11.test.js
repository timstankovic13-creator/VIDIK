'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const context={console,localStorage:{getItem:()=>null,setItem:()=>{}}};context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/vidik-platform-10.js','utf8'),context);
vm.runInContext(fs.readFileSync('js/vidik-audience-contract-1.js','utf8'),context);
const P=context.VIDIK_PLATFORM_10;
for(const audience of ['business','developer']){
 const d=P.createDecision({audience,objective:'Strategic project decision',problem:'Strategic project decision',statusQuo:{description:'Continue current approach'},options:[{id:'o1',name:'Option A',evidenceStatus:'EVIDENCE_REVIEW_REQUIRED'}],evidence:[{id:'e1'}],uncertainty:{overall:.5},opportunityCost:{known:false},equity:{assessed:false},constraints:{implementation:[]},provenance:[{id:'e1'}]});
 assert.strictEqual(d.audience,audience);assert.strictEqual(P.validateDecision(d).ok,true);assert.ok(P.scoreIntegrity(d).total>=11);
 const r=P.evaluate(d,(_,opts)=>({ranked:opts,recommended:null}));
 assert.strictEqual(r.ok,true);assert.strictEqual(r.decision.audience,audience);assert.strictEqual(r.recommendation,null);assert.strictEqual(r.decision.budgetOptions,undefined);
}
console.log('VIDIK audience runtime 11: PASS — business/developer decisions fail closed without fabricated recommendations');