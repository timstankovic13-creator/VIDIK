#!/usr/bin/env node
/** Deterministic municipal-reference ETL: parse -> validate -> normalize -> optional spine reconcile -> hash -> manifest. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const arg=n=>{const i=process.argv.indexOf(n);return i>=0?process.argv[i+1]:null};
const input=arg('--input'),out=arg('--output')||'data/reference/generated',spine=arg('--spine');
const fail=m=>{console.error(`ERROR: ${m}`);process.exit(2)};
if(!input)fail('Missing --input'); if(!fs.existsSync(input))fail(`Input not found: ${input}`); fs.mkdirSync(out,{recursive:true});
function csv(s){let R=[],r=[],c='',q=false;for(let i=0;i<s.length;i++){let x=s[i],n=s[i+1];if(q){if(x==='"'&&n==='"'){c+='"';i++}else if(x==='"')q=false;else c+=x}else if(x==='"')q=true;else if(x===','){r.push(c);c=''}else if(x==='\n'){r.push(c);R.push(r);r=[];c=''}else if(x!=='\r')c+=x}if(q)fail('Malformed CSV: unterminated quote');if(c!==''||r.length){r.push(c);R.push(r)}return R}
const norm=x=>x.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const buf=fs.readFileSync(input),rows=csv(buf.toString('utf8').replace(/^\uFEFF/,'')); if(rows.length<2)fail('Source needs header plus data');
const H=rows[0].map(norm),geo=['geo_code','csduid','csd_uid','census_subdivision_uid','census_subdivision_id','geography_code'],g=geo.find(k=>H.includes(k));
if(!g)fail(`No municipality geography identifier; expected ${geo.join(', ')}`); if(H.some((x,i)=>!x||H.indexOf(x)!==i))fail('Duplicate/empty normalized columns');
const D=rows.slice(1).filter(r=>r.some(v=>v!=='')); if(D.some(r=>r.length!==H.length))fail('CSV row width mismatch'); const ids=D.map(r=>r[H.indexOf(g)]); if(ids.some(x=>!x))fail('Missing municipality geography identifier'); const dup=[...new Set(ids.filter((x,i)=>ids.indexOf(x)!==i))]; if(dup.length)fail(`Duplicate geography IDs: ${dup.slice(0,10).join(',')}`);
let rec=null;if(spine){if(!fs.existsSync(spine))fail(`Spine not found: ${spine}`);const sb=fs.readFileSync(spine),sr=csv(sb.toString('utf8').replace(/^\uFEFF/,''));if(sr.length<2)fail('Spine needs header plus data');const SH=sr[0].map(norm),sg=geo.find(k=>SH.includes(k));if(!sg)fail('Spine has no municipality geography identifier');const set=new Set(sr.slice(1).map(r=>r[SH.indexOf(sg)]).filter(Boolean)),missing=ids.filter(x=>!set.has(x));rec={matched:ids.length-missing.length,missing:missing.length,missing_sample:missing.slice(0,20),spine_sha256:hash(sb)};if(missing.length)fail(`Reconciliation failed: ${missing.length} source IDs absent from spine`) }
const data=D.map(r=>Object.fromEntries(H.map((h,i)=>[h,r[i]]))),outbuf=Buffer.from(JSON.stringify(data,null,2)+'\n');fs.writeFileSync(path.join(out,'municipal-reference.json'),outbuf);
const m={schema_version:'2.0.0',source_file:path.basename(input),retrieved_at:new Date().toISOString(),source_sha256:hash(buf),output_sha256:hash(outbuf),row_count:data.length,columns:H,geography_key:g,reconciliation:rec,status:'validated-structural-pending-semantic-review'};fs.writeFileSync(path.join(out,'source-manifest.json'),JSON.stringify(m,null,2)+'\n');console.log(JSON.stringify(m,null,2));
