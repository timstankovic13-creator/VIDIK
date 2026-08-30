#!/usr/bin/env node
const fs=require('fs'); const path=require('path'); const crypto=require('crypto');
function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null}
const input=arg('--input'); const out=arg('--output')||'data/reference/generated'; const spine=arg('--spine');
if(!input){console.error('Missing --input. Refusing to fabricate or fetch source data.');process.exit(2)}
if(!fs.existsSync(input)){console.error(`Input not found: ${input}`);process.exit(2)}
function parseCsv(text){const rows=[];let row=[],field='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++}else quoted=false}else field+=c}else if(c==='"'){quoted=true}else if(c===','){row.push(field);field=''}else if(c==='\n'){row.push(field);rows.push(row);row=[];field=''}else if(c!=='\r'){field+=c}}if(quoted)throw new Error('unterminated-csv-quote');if(field.length||row.length){row.push(field);rows.push(row)}return rows.filter(r=>r.some(v=>v!==''))}
function norm(s){return s.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')}
function fail(msg){console.error(msg);process.exit(3)}
const buf=fs.readFileSync(input); const sha=crypto.createHash('sha256').update(buf).digest('hex');
const rows=parseCsv(buf.toString('utf8').replace(/^\uFEFF/,'')); if(rows.length<2)fail('empty-or-header-only-csv');
const header=rows.shift(); const cols=header.map(norm); if(cols.some(c=>!c)||new Set(cols).size!==cols.length)fail('invalid-or-duplicate-columns');
const width=cols.length; if(rows.some(r=>r.length!==width))fail('csv-row-width-mismatch');
const idIndex=cols.findIndex(c=>['csd_uid','csd_id','municipality_id','geography_id'].includes(c)); if(idIndex<0)fail('missing-municipal-geography-id-column');
const nameIndex=cols.findIndex(c=>['geographic_name','municipality','municipality_name','name'].includes(c)); if(nameIndex<0)fail('missing-municipality-name-column');
const ids=new Set(); const normalized=rows.map(r=>{const o={};cols.forEach((c,i)=>o[c]=r[i]);const id=r[idIndex].trim();if(!id)fail('missing-municipal-geography-id');if(ids.has(id))fail(`duplicate-municipal-geography-id:${id}`);ids.add(id);o[idIndex>=0?cols[idIndex]:'municipality_id']=id;return o});
let reconciliation=null;
if(spine){if(!fs.existsSync(spine))fail('spine-not-found');const srows=parseCsv(fs.readFileSync(spine,'utf8').replace(/^\uFEFF/,''));if(srows.length<2)fail('spine-empty');const sh=srows.shift().map(norm);const si=sh.findIndex(c=>['csd_uid','csd_id','municipality_id','geography_id'].includes(c));if(si<0)fail('spine-missing-geography-id');const spineIds=new Set(srows.map(r=>r[si]).filter(Boolean));const missing=normalized.map(r=>r[cols[idIndex]]).filter(id=>!spineIds.has(id));reconciliation={input_rows:normalized.length,spine_rows:srows.length,matched:normalized.length-missing.length,missing};if(missing.length)fail(`spine-reconciliation-failed:${missing.join('|')}`)}
fs.mkdirSync(out,{recursive:true});
const normalizedText=JSON.stringify(normalized,null,2)+'\n';const normalizedSha=crypto.createHash('sha256').update(normalizedText).digest('hex');
fs.writeFileSync(path.join(out,'normalized.json'),normalizedText);fs.writeFileSync(path.join(out,'source-manifest.json'),JSON.stringify({schema_version:'1.1.0',source_file:path.basename(input),retrieved_at:new Date().toISOString(),sha256:sha,row_count:normalized.length,columns:cols,normalized_sha256:normalizedSha,reconciliation,status:'validated-ingested'},null,2)+'\n');
fs.writeFileSync(path.join(out,'README.md'),`# Generated Municipal Reference Extract\n\nSource: ${path.basename(input)}\nRows: ${normalized.length}\nSource SHA-256: ${sha}\nNormalized SHA-256: ${normalizedSha}\nStatus: validated-ingested\n`);
console.log(JSON.stringify({status:'validated-ingested',rows:normalized.length,sha256:sha,normalized_sha256:normalizedSha,reconciliation},null,2));
