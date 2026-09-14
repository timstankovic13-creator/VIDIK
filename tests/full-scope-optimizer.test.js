'use strict';
const assert = require('node:assert/strict');
const { optimize, admissible, sensitivityEnvelope } = require('../src/full-scope/optimizer');

const baseEvidence = [{ sourceId:'a', verified:true }, { sourceId:'b', verified:true }];
const candidate = (id,effect,resource,extra={}) => ({ id, name:id, effect, resource, effectUnit:'incidents avoided', resourceUnit:'staff-hours', verified:true, evidence:baseEvidence, discoveryOnly:false, leadOnly:false, ...extra });

const result = optimize('reduce violent crime', [candidate('a',20,100), candidate('b',15,50), candidate('c',30,300)]);
assert.equal(result.comparable,true);
assert.equal(result.selected.candidateId,'b');
assert.equal(result.opportunityCost.againstCandidateId,'a');
assert.equal(result.frontier.some(x => x.candidateId === 'b'),true);

const budgeted = optimize('reduce violent crime', [candidate('a',20,100), candidate('b',15,50)], { budget:60 });
assert.equal(budgeted.selected.candidateId,'b');

const incomparable = optimize('mixed objective', [candidate('a',20,100), candidate('b',10,50,{effectUnit:'hospitalizations avoided'})]);
assert.equal(incomparable.comparable,false);
assert.equal(incomparable.reason,'incomparable-effect-or-resource-units');
assert.equal(incomparable.selected,null);

const blocked = admissible(candidate('lead',20,100,{leadOnly:true}));
assert.equal(blocked.allowed,false);
assert(blocked.reasons.includes('discovery-lead-not-eligible'));

const imported = admissible(candidate('imported',20,100,{effectsImported:true}));
assert.equal(imported.allowed,false);
assert(imported.reasons.includes('imported-effect-blocked'));

const envelope = sensitivityEnvelope(candidate('a',20,100,{uncertainty:{low:10,high:30}}));
assert.equal(envelope.defined,true);
assert.equal(envelope.lowEfficiency,0.1);
assert.equal(envelope.highEfficiency,0.3);

console.log('full-scope optimizer: PASS (multi-candidate frontier, budget feasibility, opportunity cost, incomparability, governance blocks, uncertainty envelope)');
