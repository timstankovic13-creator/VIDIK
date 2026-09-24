'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('js/interface-variants.js', 'utf8');
const css = fs.readFileSync('styles.css', 'utf8');

const requiredModes = ['cockpit', 'brief', 'workbench', 'investigate', 'map'];
for (const mode of requiredModes) assert.match(js, new RegExp('^  ' + mode + ':', 'm'));
assert.equal((html.match(/class="interface-mode"/g) || []).length, 5);
assert.match(html, /js\/interface-variants\.js/);
assert.match(js, /localStorage\.setItem\(['"]vidik-interface-mode/);
assert.match(js, /document\.body\.dataset\.interface/);
assert.match(css, /body\[data-interface="brief"\]/);
assert.match(css, /body\[data-interface="workbench"\]/);
assert.match(css, /body\[data-interface="investigate"\]/);
assert.match(css, /body\[data-interface="map"\]/);

console.log('interface variants: 5 modes present and wired to the shared decision surface');
