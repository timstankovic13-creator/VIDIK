'use strict';
const fs=require('fs');
const path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','offline-playground.html'),'utf8');
const required=[
  'Decision Playground','caseSelect','city','pool','risk','recommendation','why','whyNot','uncertainty','evidenceGate','model',
  'runAdversarial','persist','snapshot','adopt','record','recalibrate','drift','verify','audit',
  '2023-12-06','NO RECOMMENDATION','006 ANCHOR','009 Traffic Safety','010 Red Light','014 Emergency Shelter'
];
for(const token of required){if(!html.includes(token))throw new Error('missing playground surface: '+token)}
if(!html.includes('CASES.length===14'))throw new Error('14-case universe not represented');
if(!html.includes("const KEY='VIDIK_OFFLINE_PLAYGROUND_V1'"))throw new Error('offline state key missing');
if(/<script[^>]+src=/.test(html))throw new Error('playground must remain self-contained/offline');
console.log('PASS offline playground scope — '+required.length+' required surfaces');
