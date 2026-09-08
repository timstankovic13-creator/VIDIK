'use strict';

const fs = require('fs');
const path = require('path');
const { runAll } = require('./municipal-production-decision-run');

function toArtifact(result) {
  return {
    schemaVersion: 'vidik.municipal.production-decision.v1',
    generatedAt: new Date().toISOString(),
    runType: 'production-three-city-decision',
    cities: result.cities,
    acceptance: result.acceptance
  };
}

async function main() {
  const result = await runAll();
  const artifact = toArtifact(result);
  const output = process.env.VIDIK_DECISION_ARTIFACT || path.join(__dirname, '..', 'artifacts', 'municipal-three-city-production-decision.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(artifact, null, 2) + '\n');
  console.log(`municipal-production-decision-artifact: ${output}`);
}

if (require.main === module) {
  main().catch(error => {
    console.error(error.stack || error);
    process.exitCode = 1;
  });
}

module.exports = { toArtifact };
