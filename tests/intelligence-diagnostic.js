'use strict';
const m=require('../src/full-scope/intelligence-hardening');
const cases={
  4:()=>m.buildUniverseAudit('housing',[{id:'x',name:'Rent',families:['economic']}]),
  10:()=>m.transferability({population:100000,legalEnvironment:'CA'},{population:100000,legalEnvironment:'CA'}),
  17:()=>m.buildUniverseAudit('housing',[{id:'x',name:'Rent',families:['economic']}])
};
for(const n of Object.keys(cases)) console.log(JSON.stringify({case:n,result:cases[n]()}));
