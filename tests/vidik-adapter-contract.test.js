const assert = require('node:assert/strict');
const { validateAdapter, normalizeEvidence } = require('../js/vidik-adapter-contract');
const adapter = { jurisdiction:'demo', timezone:'America/Toronto', interventionMap:[], sourceRegistry:[], fieldMappings:{date:'Date', exposure:'Hours'}, temporalCoverage:'2020-2026', privacyRules:[], authorizationRules:[], decisionTemplates:[], outcomeDefinitions:[], unsupportedFields:[] };
assert.equal(validateAdapter(adapter).valid, true);
const bad = { ...adapter }; delete bad.authorizationRules; assert.equal(validateAdapter(bad).valid, false);
assert.deepEqual(normalizeEvidence(adapter,{Date:'2026-09-02',Hours:4,secret:'x'}),{date:'2026-09-02',exposure:4});
console.log('Municipal adapter contract tests passed');
