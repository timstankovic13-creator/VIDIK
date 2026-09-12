'use strict';
const assert = require('assert');
const { runRealEvidenceCity } = require('../scripts/real-three-city-evidence-run');

(async () => {
  const decision = await runRealEvidenceCity('Ottawa');
  assert.ok(decision.interventionUniverse.acquisition);
  assert.ok(decision.interventionUniverse.acquisition.acquisitionHash);
  assert.ok(decision.governanceOverridesAudit.audit.acquisitionHash);
  assert.ok(decision.reoptimizationExecutionReadiness.evidenceAcquisition);
  assert.ok(decision.interventionUniverse.interventions.some(x => x.status === 'ADMISSIBLE'));
  assert.ok(decision.interventionUniverse.interventions.some(x => x.evidenceGap.length >= 0));
  console.log('acquisition canonical integration passed');
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
