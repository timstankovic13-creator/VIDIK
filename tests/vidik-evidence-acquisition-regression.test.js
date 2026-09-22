const assert = require('node:assert/strict');
const { minimumRequest, validateRequest } = require('../js/rc4-evidence-acquisition-spec');
for (const id of ['006','009','010','014']) { const fields = minimumRequest(id); assert.equal(validateRequest(id, fields).valid, true); }
assert.equal(validateRequest('009', [...minimumRequest('009'),'extra']).valid, false);
assert.equal(validateRequest('014', minimumRequest('014').filter(x => x !== 'marginal bed exposure')).valid, false);
console.log('Evidence acquisition regression passed');
