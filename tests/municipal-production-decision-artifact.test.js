'use strict';

const fs = require('fs');
const path = require('path');

const artifactPath = process.env.VIDIK_DECISION_ARTIFACT || path.join(__dirname, '..', 'artifacts', 'municipal-three-city-production-decision.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(artifact.schemaVersion === 'vidik.municipal.production-decision.v1', 'artifact-schema-version');
assert(artifact.runType === 'production-three-city-decision', 'artifact-run-type');
assert(typeof artifact.generatedAt === 'string' && !Number.isNaN(Date.parse(artifact.generatedAt)), 'artifact-generated-at');
assert(Array.isArray(artifact.cities) && artifact.cities.length === 3, 'artifact-three-cities');
assert(JSON.stringify(artifact.cities.map(x => x.city)) === JSON.stringify(['Ottawa', 'Toronto', 'Melbourne']), 'artifact-city-order');

const byCity = Object.fromEntries(artifact.cities.map(x => [x.city, x]));
const ottawa = byCity.Ottawa;
const toronto = byCity.Toronto;
const melbourne = byCity.Melbourne;

assert(ottawa.decisionState === 'RECOMMENDATION', 'ottawa-recommendation-state');
assert(ottawa.recommendation === 'housing', 'ottawa-housing-recommendation');
assert(ottawa.observedContext.value === 2952, 'ottawa-observed-value');
assert(ottawa.sourceLineage && ottawa.sourceLineage.sourceUrl.includes('ottawa.ca'), 'ottawa-source-lineage');
assert(ottawa.lineage.some(x => x.kind === 'causal_effect' && x.parameterId === 'housing:effect'), 'ottawa-causal-lineage');
assert(ottawa.counterfactual && ottawa.counterfactual.incrementalEffect === 0.42, 'ottawa-counterfactual');
assert(ottawa.learning && ottawa.learning.recalibration.targetParameterId === 'housing:effect', 'ottawa-learning');

assert(toronto.decisionState === 'RECOMMENDATION', 'toronto-recommendation-state');
assert(toronto.recommendation === 'housing', 'toronto-housing-recommendation');
assert(toronto.observedContext.value === 15400, 'toronto-observed-value');
assert(toronto.sourceLineage && toronto.sourceLineage.sourceUrl.includes('toronto.ca'), 'toronto-source-lineage');
assert(toronto.sourceLineage.sourceUrl !== ottawa.sourceLineage.sourceUrl, 'city-source-distinctness');
const torontoHousing = toronto.interventionComparison.find(x => x.id === 'housing');
assert(torontoHousing.gate.admissible === true, 'toronto-housing-admissible');
assert(torontoHousing.gate.causalEvidence.mode === 'site-supported', 'toronto-site-supported');
assert(torontoHousing.gate.causalEvidence.rationale.includes('included Toronto directly'), 'toronto-site-rationale');
assert(toronto.learning && toronto.learning.recalibration.application === 'EXPLICIT_PARAMETER_MAPPING', 'toronto-learning');

assert(melbourne.decisionState === 'BLOCKED', 'melbourne-blocked-state');
assert(melbourne.recommendation === null, 'melbourne-no-recommendation');
assert(melbourne.observedContext.value === 147, 'melbourne-observed-value');
assert(melbourne.audit.failureClosed === true, 'melbourne-failure-closed');
assert(melbourne.learning === null, 'melbourne-no-learning-without-decision');
const melbourneHousing = melbourne.interventionComparison.find(x => x.id === 'housing');
assert(melbourneHousing.gate.failures.includes('causal-effect-not-transportable-to-city'), 'melbourne-transportability-block');

console.log('municipal-production-decision-artifact: PASS');
