'use strict';
const fs = require('fs');
const path = require('path');
const { runCanonicalCity } = require('./municipal-canonical-decision-run');
const { artifact, append, verifyArtifact } = require('../js/decision-artifact-store');
const { validateArtifactCompleteness } = require('../js/vidik-production-hardening-16');
async function persistCity(city, options = {}) {
  const decision = await runCanonicalCity(city, options);
  const candidate = artifact({
    decisionId: decision.identityBrief.decisionId,
    decision,
    audit: decision.governanceOverridesAudit?.audit || {},
    counterfactual: decision.counterfactualVault,
    evidence: decision.evidenceGraph,
    parameters: decision.parameters,
    analysis: decision.uncertaintyBudget?.decisionIntelligence || null,
    governance: decision.governanceOverridesAudit,
    learning: decision.outcomeLearningCheckpoints,
    provenance: { sourceLineage: decision.evidenceGraph?.lineage || null, evidenceHash: decision.integrity?.evidenceHash || null }
  });
  const completeness = validateArtifactCompleteness(candidate);
  if (!completeness.complete) throw new Error(`persisted-artifact-incomplete:${completeness.missing.join(',')}`);
  const integrity = verifyArtifact(candidate);
  if (!integrity.ok) throw new Error(`persisted-artifact-integrity-failed:${integrity.reason}`);
  return candidate;
}
async function persistAll(options = {}) { const cities = ['Ottawa', 'Toronto', 'Melbourne'], results = []; for (const city of cities) results.push(await persistCity(city, options)); return { schemaVersion: 'vidik.persisted-three-city-artifacts.v1', cities: results }; }
if (require.main === module) { const output = process.argv.find(x => x.startsWith('--output='))?.split('=')[1] || path.join('artifacts', 'canonical-decision-artifacts.json'); persistAll().then(result => { fs.mkdirSync(path.dirname(output), { recursive: true }); for (const a of result.cities) append(output, a); process.stdout.write(JSON.stringify({ output, count: result.cities.length, decisionIds: result.cities.map(x => x.decisionId) }, null, 2) + '\n'); }).catch(error => { console.error(error.stack || error); process.exitCode = 1; }); }
module.exports = { persistCity, persistAll };
