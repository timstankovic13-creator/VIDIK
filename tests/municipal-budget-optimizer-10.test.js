'use strict';
const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const code=fs.readFileSync(require('node:path').join(__dirname,'../js/municipal-budget-optimizer-10.js'),'utf8');const c={window:{},console};vm.createContext(c);vm.runInContext(code,c);const O=c.window.VIDIK_MUNICIPAL_BUDGET_OPTIMIZER_10;
assert.equal(O.validate({budget:100,interventions:[{id:'a',cost:50,maxCost:100,expectedValue:10}]}).ok,true);
assert.equal(O.validate({budget:100,interventions:[{id:'a',cost:null,maxCost:100,expectedValue:10}]}).code,'INCOMPLETE_PORTFOLIO_PARAMETERS');
const r=O.optimize({budget:100,interventions:[{id:'a',cost:50,maxCost:50,expectedValue:10},{id:'b',cost:50,maxCost:50,expectedValue:20}]});assert.equal(r.ok,true);assert.equal(r.unallocated,0);assert.equal(r.fullEnvelopeCompared,true);assert.equal(r.allocation.length,2);
console.log('VIDIK municipal budget optimizer: PASS');
