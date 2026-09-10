const test=require('node:test');
const assert=require('node:assert/strict');

global.V={weights:{need:0.2,effect:0.35,capacity:0.15,feasibility:0.15,equity:0.1,risk:0.05}};
global.E={};
global.VIDIK_HARDENING={};
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../js/candidates.js'),'utf8');
vm.runInThisContext(source,{filename:'candidates.js'});

test('candidate registry remains limited to evidence-backed production candidates',()=>{
 assert.ok(Array.isArray(C));
 assert.equal(C.length,3,'unsupported universe options must not enter the optimizer candidate registry');
 for(const id of ['housing','ase','paramedic']) assert.ok(C.some(c=>c.id===id),`seeded candidate missing: ${id}`);
});

test('broader intervention universe is explicit and fail-closed',()=>{
 assert.ok(Array.isArray(INTERVENTION_UNIVERSE));
 assert.ok(INTERVENTION_UNIVERSE.length>=10);
 const names=INTERVENTION_UNIVERSE.flatMap(([,options])=>options);
 for(const name of ['rapid rehousing','rent assistance','harm reduction','community paramedicine','traffic calming','green infrastructure','income supports','youth services','maintenance','zoning reform']) {
  assert.ok(names.includes(name),`universe option missing: ${name}`);
 }
 assert.ok(names.length>50,'VIDIK intervention universe must be materially broader than the seeded production candidates');
});

// Regression guard: universe expansion must never silently widen optimization eligibility.
