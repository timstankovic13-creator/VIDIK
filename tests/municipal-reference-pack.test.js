const fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process'),assert=require('assert');
const script=path.resolve(__dirname,'../scripts/municipal-reference-pack-v2.js'); const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vidik-ref-'));
function run(csv,extra=''){const input=path.join(dir,`in-${Date.now()}.csv`);fs.writeFileSync(input,csv);const output=path.join(dir,`out-${Date.now()}`);let r=cp.spawnSync(process.execPath,[script,'--input',input,'--output',output,...extra.split(' ').filter(Boolean)],{encoding:'utf8'});return {r,output}}
let x=run('CSDUID,Name,Population\n3506008,Ottawa,1017449\n3507001,Toronto,2794356\n');assert.equal(x.r.status,0);assert.equal(JSON.parse(fs.readFileSync(path.join(x.output,'source-manifest.json'))).row_count,2);assert(fs.existsSync(path.join(x.output,'municipal-reference.json')));
x=run('CSDUID,Name\n3506008,"Ottawa, Ontario"\n3507001,Toronto\n');assert.equal(x.r.status,0);
x=run('CSDUID,Name\n3506008,Ottawa\n3506008,Toronto\n');assert.notEqual(x.r.status,0);assert.match(x.r.stderr,/Duplicate geography IDs/);
x=run('Name,Population\nOttawa,1017449\n');assert.notEqual(x.r.status,0);assert.match(x.r.stderr,/No municipality geography identifier/);
x=run('CSDUID,Name\n3506008,Ottawa\n','--spine '+path.join(dir,'missing.csv'));assert.notEqual(x.r.status,0);
const spine=path.join(dir,'spine.csv');fs.writeFileSync(spine,'CSDUID,Name\n3506008,Ottawa\n3507001,Toronto\n');x=run('CSDUID,Name\n3506008,Ottawa\n3507001,Toronto\n','--spine '+spine);assert.equal(x.r.status,0);assert.equal(JSON.parse(fs.readFileSync(path.join(x.output,'source-manifest.json'))).reconciliation.missing,0);
x=run('CSDUID,Name\n3506008,"Ottawa\n');assert.notEqual(x.r.status,0);assert.match(x.r.stderr,/unterminated quote/);
console.log('municipal-reference-pack tests: PASS');
