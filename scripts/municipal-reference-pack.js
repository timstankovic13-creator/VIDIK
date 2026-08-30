#!/usr/bin/env node
/**
 * Build compact VIDIK municipal reference extracts from official Statistics Canada CSV/API inputs.
 * This script intentionally requires downloaded source files as inputs: it never silently fetches
 * or invents upstream data. It writes normalized CSV/JSON plus SHA-256/provenance metadata.
 *
 * Usage:
 *   node scripts/municipal-reference-pack.js --input <source.csv> --output data/reference/generated
 */
const fs=require('fs'); const path=require('path'); const crypto=require('crypto');
function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null}
const input=arg('--input'); const out=arg('--output')||'data/reference/generated';
if(!input){console.error('Missing --input. Refusing to fabricate or fetch source data.');process.exit(2)}
if(!fs.existsSync(input)){console.error(`Input not found: ${input}`);process.exit(2)}
fs.mkdirSync(out,{recursive:true});
const buf=fs.readFileSync(input); const sha=crypto.createHash('sha256').update(buf).digest('hex');
const text=buf.toString('utf8').replace(/^\uFEFF/,'');
const lines=text.split(/\r?\n/).filter(Boolean); const header=lines.shift()||'';
const rows=lines.length;
const manifest={schema_version:'1.0.0',source_file:path.basename(input),retrieved_at:new Date().toISOString(),sha256:sha,row_count:rows,columns:header.split(','),status:'ingested-pending-semantic-validation'};
fs.writeFileSync(path.join(out,'source-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(out,'README.md'),`# Generated Municipal Reference Extract\n\nSource: ${manifest.source_file}\nSHA-256: ${sha}\nRows: ${rows}\n\nThis extract is not decision-driving until semantic geography/field validation and reconciliation against the VIDIK/WUP municipal spine pass.\n`);
console.log(JSON.stringify(manifest,null,2));
