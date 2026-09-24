'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const js = fs.readFileSync('js/interface-experience.js', 'utf8');
const shell = fs.readFileSync('js/interface-variants.js', 'utf8');
const css = fs.readFileSync('styles/finish-line-experience.css', 'utf8');

for (const workspace of ['municipal','business','community','research','enterprise']) {
  assert.ok(js.includes(workspace + ':{'), 'missing workspace: ' + workspace);
  assert.ok(css.includes('body[data-workspace="' + workspace + '"]'), 'missing workspace styling: ' + workspace);
}
assert.ok(js.includes('imageForCandidate'));
assert.ok(js.includes('scrollIntoView'));
assert.ok(js.includes('experienceContext'));
assert.ok(shell.includes('installFinishLineExperience'));
assert.ok(shell.includes('finish-line-experience.css'));
assert.ok(shell.includes('interface-experience.js'));
assert.ok(css.includes('.experience-context'));
assert.ok(css.includes('.journey-progress'));
assert.ok(css.includes('.intervention-visual'));

console.log('finish-line experience: business-aware journey, imagery and transitions are wired');
