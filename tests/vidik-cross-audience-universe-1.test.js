'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const context={console};context.window=context;vm.createContext(context);
vm.runInContext(fs.readFileSync('js/vidik-cross-audience-universe-1.js','utf8'),context);
const U=context.VIDIK_CROSS_AUDIENCE_UNIVERSE_1;
assert.ok(U);assert.strictEqual(U.catalog.length,12);
for(const audience of ['business','developer']){const rows=U.discover('budget and project risk',audience);assert.ok(rows.length>=6);assert.ok(rows.every(x=>x.audiences.includes(audience)));assert.ok(rows.every(x=>x.evidenceStatus===undefined),'candidate registry must not imply evidence support');}
assert.ok(U.discover('site development flood risk','developer')[0].id==='dev-climate-resilience');
assert.ok(U.discover('capital cost operations','business').some(x=>x.id==='biz-capital-priority'));
console.log('VIDIK cross-audience universe 1: PASS — business/developer candidates remain hypotheses until evidence is verified');