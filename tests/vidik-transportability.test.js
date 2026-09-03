'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const matrix = fs.readFileSync(path.join(__dirname,'../data/VIDIK_TRANSPORTABILITY_MATRIX.md'),'utf8');

const required = [
  ['Ottawa','baseline adapter','source/terminology mappings preserve decision ontology'],
  ['Toronto','Canadian transfer','intervention and governance mappings are independently valid'],
  ['Melbourne','jurisdictional transfer','units, governance, provenance and parameter meanings are re-established']
];
for (const [city, test, proof] of required) {
  assert.ok(matrix.includes(city));
  assert.ok(matrix.includes(test));
  assert.ok(matrix.includes(proof));
}
assert.ok(/City-specific evidence remains city-specific/i.test(matrix));
assert.ok(/No silent transfer of effects, baselines, costs or causal parameters/i.test(matrix));

function transportable({ sourceCity, targetCity, mappingsValid, parametersReestablished, provenanceValid }) {
  return sourceCity !== targetCity && mappingsValid === true && parametersReestablished === true && provenanceValid === true;
}
assert.equal(transportable({sourceCity:'Ottawa',targetCity:'Toronto',mappingsValid:true,parametersReestablished:true,provenanceValid:true}),true);
for (const bad of [
  {mappingsValid:false,parametersReestablished:true,provenanceValid:true},
  {mappingsValid:true,parametersReestablished:false,provenanceValid:true},
  {mappingsValid:true,parametersReestablished:true,provenanceValid:false},
  {sourceCity:'Ottawa',targetCity:'Ottawa',mappingsValid:true,parametersReestablished:true,provenanceValid:true}
]) assert.equal(transportable({sourceCity:'Ottawa',targetCity:'Toronto',mappingsValid:true,parametersReestablished:true,provenanceValid:true,...bad}),false);
console.log('PASS — transportability gate requires independent mappings, re-established parameters, and provenance');
