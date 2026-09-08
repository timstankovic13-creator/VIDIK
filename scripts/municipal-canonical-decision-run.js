#!/usr/bin/env node
'use strict';

const { runCity, runAll } = require('./municipal-production-decision-run');
const { buildCanonicalDecisionObject } = require('../js/vidik-canonical-decision-object');

function withResourceEnvelope(options = {}, amount = null) {
  if (amount == null) return options;
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error('marginal-resource-amount-must-be-positive-finite');
  return { ...options, resourceEnvelope: { marginalUnit: { amount: Number(amount), unit: 'CAD' } } };
}

async function runCanonicalCity(city, options = {}) {
  const run = await runCity(city, options);
  return buildCanonicalDecisionObject(run);
}

async function runCanonicalAll(options = {}) {
  const result = await runAll(options);
  const cities = result.cities.map(buildCanonicalDecisionObject);
  return {
    schemaVersion: 'vidik.canonical-three-city-decision.v1',
    decisionProblem: result.decisionProblem,
    cities,
    acceptance: result.acceptance
  };
}

if (require.main === module) {
  const amountArg = process.argv.find(x => x.startsWith('--marginal-cad='));
  const amount = amountArg ? amountArg.split('=')[1] : null;
  const options = withResourceEnvelope({}, amount);
  runCanonicalAll(options)
    .then(result => process.stdout.write(JSON.stringify(result, null, 2) + '\n'))
    .catch(error => { console.error(error.stack || error); process.exitCode = 1; });
}

module.exports = { withResourceEnvelope, runCanonicalCity, runCanonicalAll };
