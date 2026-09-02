const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'offline-workbench.html'), 'utf8');

const required = [
  'FULL OFFLINE WORKBENCH',
  'OFFLINE READY / TESTABLE',
  'BLOCKED — REAL MUNICIPAL DATA',
  'BLOCKED — ACTIONS / CI',
  'HISTORICALLY FROZEN',
  '2023-12-06',
  '001–014',
  '006 ANCHOR',
  '009 ASE',
  '010 RLC',
  '014 Shelter',
  'Minimum Sufficient Evidence',
  'Claim-scaled analysis',
  'Experiment contract & execution',
  'Customer workflow',
  'Decision integrity & lifecycle',
  'Municipal scale',
  'Security / hostile validation',
  'Existing full VIDIK application',
  'NO RECOMMENDATION'
];

for (const token of required) {
  if (!html.includes(token)) throw new Error(`Offline workbench scope missing: ${token}`);
}

if (!html.includes('src="index.html"')) throw new Error('Workbench must expose the existing full VIDIK application');
if (!html.includes('iframe')) throw new Error('Workbench must provide an integration surface for the existing application');

console.log(`offline-workbench-scope: PASS (${required.length} scope assertions)`);
