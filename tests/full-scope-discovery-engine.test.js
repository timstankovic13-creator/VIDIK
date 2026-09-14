'use strict';
const assert = require('node:assert/strict');
const { expandProblem, candidateUniverse, relevance } = require('../src/full-scope/discovery-engine');

const terms = expandProblem('reduce violent crime');
assert(terms.includes('crime'));
assert(terms.includes('homicide'));
assert(terms.length <= 80);

const records = [
  {id:'a',title:'Community violence interruption',description:'violence prevention and safety',sourceId:'src-a',jurisdiction:'CA'},
  {id:'b',title:'Automated speed management',description:'traffic collision safety',sourceId:'src-b',jurisdiction:'CA'},
  {id:'c',title:'Community violence interruption',description:'duplicate',sourceId:'src-c',jurisdiction:'US'},
  {id:'bad',title:'Unnamed provenance failure',description:'crime',sourceId:''},
  {id:'d',title:'Housing retrofit',description:'affordable housing',sourceId:'src-d',jurisdiction:'CA'}
];

const universe = candidateUniverse('reduce violent crime',records,{limit:10});
assert.equal(universe.schemaVersion,'vidik.intervention-universe.v1');
assert(universe.considered === 5);
assert(universe.matched >= 1);
assert(universe.provenanceGaps === 1);
assert(universe.candidates.every(c => c.discoveryOnly && c.leadOnly));
assert(universe.candidates.every(c => c.effectsImported === false && c.causalEffectImported === false));
assert.equal(universe.recommendationAllowed,false);
assert.equal(universe.effectsImported,false);
assert.equal(new Set(universe.candidates.map(c=>c.name.toLowerCase())).size,universe.candidates.length);

const noMatch = candidateUniverse('quantum asteroid governance',records,{minRelevance:0.9});
assert.equal(noMatch.matched,0);
assert.equal(noMatch.recommendationAllowed,false);

assert.equal(relevance({title:'flood resilience',description:'stormwater'},['flood','stormwater']) > 0,true);
assert.equal(relevance({title:'',description:''},['crime']),0);

const hostile = candidateUniverse('crime',[{id:'x',title:'Fake effect',description:'crime',sourceId:'s',effect:999,parameter:{effect:999},causalEffectImported:true}]);
assert.equal(hostile.candidates[0].effectsImported,false);
assert.equal(hostile.candidates[0].causalEffectImported,false);
assert.equal(hostile.recommendationAllowed,false);

console.log('full-scope discovery engine: PASS (arbitrary problems, candidate universe, provenance and anti-effect import)');
