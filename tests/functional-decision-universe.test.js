const test=require('node:test');
const assert=require('node:assert/strict');

global.V={weights:{need:0.2,effect:0.35,capacity:0.15,feasibility:0.15,equity:0.1,risk:0.05}};
global.E={};
global.VIDIK_HARDENING={};
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../js/candidates.js'),'utf8');
vm.runInThisContext(source,{filename:'candidates.js'});

test('candidate registry exposes the broader intervention universe',()=>{
 assert.ok(Array.isArray(C));
 assert.ok(C.length>3,'VIDIK must not collapse the intervention universe to three seeded options');
 for(const id of ['housing','ase','paramedic']) assert.ok(C.some(c=>c.id===id),`seeded candidate missing: ${id}`);
 for(const name of ['rapid rehousing','rent assistance','harm reduction','community paramedicine','traffic calming','green infrastructure','income supports','youth services','maintenance','zoning reform']) {
  assert.ok(C.some(c=>c.name===name),`universe option missing: ${name}`);
 }
});

test('new universe options fail closed until evidence and parameters exist',()=>{
 const candidate=C.find(c=>c.name==='rapid rehousing');
 assert.ok(candidate);
 assert.equal(candidate.params.effect,null);
 assert.equal(candidate.params.need,null);
});
