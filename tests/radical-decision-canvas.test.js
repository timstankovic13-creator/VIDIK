const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('radical decision canvas owns the opening and analysis states', () => {
  const css = fs.readFileSync('styles/decision-experience-v2.css', 'utf8');
  assert.match(css, /grid-template-columns:minmax\(0,1\.12fr\)/);
  assert.match(css, /body:not\(\[data-interface-journey="active"\]\) \.decision-composer/);
  assert.match(css, /body\[data-journey-state="building"\] \.hero\{display:none!important\}/);
  assert.match(css, /body\[data-journey-state="building"\] \.journey-stage/);
  assert.match(css, /body\[data-journey-state="decision"\] \.hero\{display:none!important\}/);
  assert.match(css, /body\[data-journey-state="decision"\] \.answer-card/);
  assert.match(css, /@media\(max-width:850px\)/);
});

test('new shell remains directly loaded and production journey is preserved', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /styles\/decision-experience-v2\.css\?v=/);
  assert.match(html, /js\/decision-experience-v2\.js\?v=/);
  assert.match(html, /id="decisionProblem"/);
  assert.match(html, /id="runDecision"/);
});
