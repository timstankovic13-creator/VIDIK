'use strict';

const fs = require('fs');
const path = require('path');
const { runCanonicalCity } = require('./municipal-canonical-decision-run');
const { buildCanonicalDecisionObject } = require('../js/vidik-canonical-decision-object');
const { artifact, append } = require('../js/decision-artifact-store');

async function persistCity(city, options = {}) {
  const run = await runCanonicalCity(city, options);
  const decision = buildCanonicalDecisionObject(run);
  const a = artifact({
    decisionId: decision.identityBrief.decisionId,
    decision,
    audit: { ...(run.audit || {}), decisionState: run.decisionState || null },
    counterfactual: decision.counterfactualVault,
    evidence: decision.evidenceGraph,
    parameters: decision.parameters,
    analysis: decision.uncertaintyBudget.decisionIntelligence,
    governance: decision.governanceOverridesAudit,
    learning: decision.outcomeLearningCheckpoints,
    provenance: { sourceLineage: run.sourceLineage || null, evidenceHash: run.audit?.evidenceHash || null }
  });
  return a;
}

async function persistAll(options = {}) {
  const cities = ['Ottawa', 'Toronto', 'Melbourne'];
  const results = [];
  for (const city of cities) results.push(await persistCity(city, options));
  return { schemaVersion: 'vidik.persisted-three-city-artifacts.v1', cities: results };
}

if (require.main === module) {
  const output = process.argv.find(x => x.startsWith('--output='))?.split('=')[1] || path.join('artifacts', 'canonical-decision-artifacts.jsonl');
  persistAll().then(result => {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    for (const a of result.cities) append(output, a);
    process.stdout.write(JSON.stringify({ output, count: result.cities.length, decisionIds: result.cities.map(x => x.decisionId) }, null, 2) + '\n');
  }).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
}

module.exports = { persistCity, persistAll };
