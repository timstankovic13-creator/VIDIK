'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateScenario, allocateFiveMillion } = require('../js/vidik-public-safety-5m-lab');
const { validateEvidenceReturn } = require('../js/vidik-evidence-request-validator');
const { freezeDecisionSnapshot, recordHumanDecision } = require('../js/vidik-lifecycle-contract');
const manifest = require('../data/VIDIK_EVIDENCE_REQUEST_MANIFEST.json');

const required = ['temporal inadmissibility','aggregate evidence','hidden confounding','spillover','correlated uncertainty','denominator','contradictory evidence','extreme','missing outcome','recommendation flips','malicious','human override'];
const doc = fs.readFileSync(path.join(__dirname,'../data/VIDIK_DECISION_RED_TEAM.md'),'utf8').toLowerCase();
for (const attack of required) assert.ok(doc.includes(attack), `missing red-team attack: ${attack}`);
assert.ok(doc.includes('refuses safely'));

const valid = { id:'RED-TEAM', name:'synthetic', syntheticAssumption:true, candidates:[{id:'A',min:0,max:5000000,unitCost:1,valuePerDollar:1,risk:.1}] };
for (const mutation of [
  { syntheticAssumption:false },
  { candidates:[{id:'A',min:0,max:5000000,unitCost:0,valuePerDollar:1,risk:.1}] },
  { candidates:[{id:'A',min:0,max:5000000,unitCost:1,valuePerDollar:'1',risk:.1}] },
  { candidates:[{id:'A',min:0,max:5000000,unitCost:1,valuePerDollar:Infinity,risk:.1}] },
  { candidates:[{id:'A',min:0,max:5000000,unitCost:1,valuePerDollar:1,risk:2}] }
]) assert.equal(validateScenario({...valid,...mutation}).pass,false);
const lab = allocateFiveMillion(valid);
assert.equal(lab.productionRecommendation,null); assert.equal(lab.effectEstimate,null); assert.equal(lab.roi,null);

const request = manifest.requests.find(r=>r.case==='009');
const admissible = { temporalAdmissible:true, provenanceComplete:true, exposureVerified:true, comparatorDefensible:true, measurementReady:true, fields:Object.fromEntries(request.fields.map(f=>[f,{value:'verified',source:'record-001'}])) };
assert.equal(validateEvidenceReturn(request, admissible).promotable,true);
for (const attack of [
  { temporalAdmissible:false }, { exposureVerified:false }, { comparatorDefensible:false }, { measurementReady:false },
  { fields:{...admissible.fields,'concurrent intervention history':'aggregate only'} }
]) assert.equal(validateEvidenceReturn(request,{...admissible,...attack}).promotable,false);

const snapshot = freezeDecisionSnapshot({id:'RED-HISTORY',recommendation:'NO_RECOMMENDATION',evidenceVersion:'v1',parameters:{x:1}});
const human = recordHumanDecision(snapshot,'OVERRIDE','Independent human rationale');
assert.equal(human.originalRecommendation,'NO_RECOMMENDATION');
assert.equal(snapshot.recommendation,'NO_RECOMMENDATION');
assert.throws(() => { snapshot.recommendation='OVERRIDE'; }, TypeError);

console.log(`PASS — ${required.length} red-team attack classes defined; adversarial inputs, evidence gates, and historical overwrite refuse safely`);
