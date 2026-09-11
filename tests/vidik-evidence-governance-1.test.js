'use strict';
const assert=require('assert');const fs=require('fs');const vm=require('vm');
const context={console};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('js/vidik-evidence-governance-1.js','utf8'),context);const G=context.VIDIK_EVIDENCE_GOVERNANCE_1;
assert.strictEqual(G.transportabilityScore('Ottawa','Ottawa'),1);assert.strictEqual(G.transportabilityScore('CA-ON','CA-QC'),.8);assert.strictEqual(G.transportabilityScore('Canada','Australia'),0);assert.strictEqual(G.transportabilityScore('Canada','Australia',.9),.9);
const base={id:'e1',quality:.9,evidenceQuality:.9,sourceJurisdiction:'Canada',targetJurisdiction:'Ottawa, Canada',freshnessDate:'2026-09-10',now:'2026-09-11',unit:'CAD',requiredUnit:'CAD'};
assert.strictEqual(G.assessEvidence(base).admissible,true);assert.ok(G.assessEvidence({...base,transportability:{similarity:.79}}).failures.includes('transportability-below-production-threshold'));assert.ok(G.assessEvidence({...base,transportability:{similarity:.9},freshnessDate:'2020-01-01'}).failures.includes('evidence-stale'));assert.ok(G.assessEvidence({...base,unit:'USD'}).failures.includes('unit-mismatch'));assert.ok(G.assessEvidence({...base,freshnessDate:undefined}).failures.includes('freshness-date-missing'));
assert.strictEqual(G.validateEvidenceSet([{id:'a'},{id:'b'}]).ok,true);assert.strictEqual(G.validateEvidenceSet([{id:'a'},{id:'a'}]).code,'DUPLICATE_EVIDENCE');assert.strictEqual(G.validateEvidenceSet([{value:1}]).code,'EVIDENCE_ID_MISSING');
console.log('VIDIK evidence governance 1: PASS');
