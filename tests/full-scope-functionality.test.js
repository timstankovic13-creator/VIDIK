'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'full-scope.html'), 'utf8');

assert.match(html, /VIDIK · FULL-SCOPE FUNCTIONALITY/);
assert.match(html, /Run full-scope discovery/);
assert.match(html, /Government of Canada Open Government Portal/);
assert.match(html, /Ontario Data Catalogue/);
assert.match(html, /Data\.gov/);
assert.match(html, /UK Government Data Service/);
assert.match(html, /Australian Government Data Catalogue/);
assert.match(html, /OpenAlex/);
assert.match(html, /PubMed \/ NCBI/);
assert.match(html, /effectsImported:false/);
assert.match(html, /comparableCityEffectsImported:false/);
assert.match(html, /recommendation:\{allowed:false/);
assert.match(html, /statusQuo:\{type:'explicit-baseline'/);
assert.match(html, /auditHash=await hash\(audit\)/);
assert.match(html, /source-failures|sourceFailures/);
assert.match(html, /evidence-leads-found/);
assert.match(html, /DISCOVERY LEAD/);
assert.match(html, /NO EFFECT IMPORT/);

// Guard against the most dangerous regression: turning source/search results into a recommendation.
assert.equal((html.match(/recommendation:\{allowed:false/g) || []).length, 1);
assert.equal((html.match(/effectsImported:false/g) || []).length >= 1, true);
assert.equal((html.match(/causalEffectImported:false/g) || []).length >= 1, true);

console.log('FULL-SCOPE FUNCTIONALITY CONTRACT: PASS');
