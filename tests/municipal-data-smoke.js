#!/usr/bin/env node
const assert = require('assert');
const { buildOttawaContext, fingerprint, CSDUID } = require('../scripts/ottawa-adapter');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ctx = buildOttawaContext();
assert.equal(ctx.geography.csduid, CSDUID);
assert.equal(ctx.population.census_2021, 1017449);
assert.equal(ctx.population.census_2016, 934243);
assert.equal(ctx.integrity, 'source-registered');
assert.match(fingerprint(ctx), /^[0-9a-f]{64}$/);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vidik-reconcile-'));
const wup = path.join(dir, 'wup.csv'), stat = path.join(dir, 'statcan.csv'), out = path.join(dir, 'report.json');
fs.writeFileSync(wup, 'CSDUID,name\n2021A00053506008,Ottawa\n');
fs.writeFileSync(stat, 'CSDUID,population\n2021A00053506008,1017449\n');
execFileSync('python3', ['scripts/wup-statcan-reconcile.py', '--wup', wup, '--statcan', stat, '--out', out], {stdio:'pipe'});
const report = JSON.parse(fs.readFileSync(out, 'utf8'));
assert.equal(report.status, 'pass');
assert.equal(report.matched, 1);
assert.equal(report.only_wup, 0);
assert.equal(report.only_statcan, 0);
console.log('municipal data smoke PASS');
