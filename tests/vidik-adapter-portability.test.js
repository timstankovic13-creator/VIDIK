const assert = require('node:assert/strict');
const { validateAdapter } = require('../js/vidik-adapter-contract');
function adapter(jurisdiction) { return { jurisdiction, timezone:'America/Toronto', interventionMap:[], sourceRegistry:[], fieldMappings:{}, temporalCoverage:'2020-2026', privacyRules:[], authorizationRules:[], decisionTemplates:[], outcomeDefinitions:[], unsupportedFields:[] }; }
assert.equal(validateAdapter(adapter('Ottawa')).valid, true);
assert.equal(validateAdapter(adapter('Toronto')).valid, true);
assert.equal(validateAdapter(adapter('Melbourne')).valid, true);
assert.deepEqual(Object.keys(adapter('Ottawa')).sort(), Object.keys(adapter('Toronto')).sort());
console.log('Municipal adapter portability tests passed');
