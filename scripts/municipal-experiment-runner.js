#!/usr/bin/env node
'use strict';

const { runAll } = require('./municipal-production-decision-run');

const LIVE_CACHE = new Map();
async function cachedFetch(url, init) {
  if (!LIVE_CACHE.has(url)) {
    const response = await fetch(url, init);
    const text = await response.text();
    LIVE_CACHE.set(url, { ok: response.ok, status: response.status, headers: response.headers, text });
  }
  const cached = LIVE_CACHE.get(url);
  return { ok: cached.ok, status: cached.status, headers: cached.headers, text: async () => cached.text };
}

const EXPERIMENTS = [
  {
    id: 'baseline-three-city',
    description: 'Run the same live municipal context through the production decision architecture with default evidence gates.',
    options: {}
  },
  {
    id: 'ottawa-outcome-within-tolerance',
    description: 'Run the baseline with an observed Ottawa outcome close to the predicted Housing First effect; no drift should be detected.',
    options: { outcome: { predicted: 0.42, observed: 0.40, checkpoint: '6-month', kind: 'observed-outcome', provenance: 'experiment-input' } }
  },
  {
    id: 'ottawa-outcome-drift',
    description: 'Run the baseline with a materially worse observed outcome; the learning layer should flag drift and propose an explicit recalibration without silently applying it.',
    options: { outcome: { predicted: 0.42, observed: 0.30, checkpoint: '6-month', kind: 'observed-outcome', provenance: 'experiment-input' } }
  },
  {
    id: 'ottawa-competing-intervention-flip',
    description: 'Introduce registered scenario evidence for ASE in Ottawa strong enough to beat Housing First; recommendation should flip to ASE.',
    options: { scenarioEvidence: { Ottawa: { ase: { admissible: true, evidence: { id: 'ase-scenario-ottawa', estimate: 0.80, unit: 'scenario effect', uncertainty: { low: 0.70, high: 0.90 }, jurisdiction: 'Ottawa', mode: 'scenario' } } } } }
  },
  {
    id: 'melbourne-transportability-unlock',
    description: 'Introduce explicit Melbourne/Australia causal evidence for Housing First; the default cross-country transport block should disappear.',
    options: { scenarioEvidence: { Melbourne: { housing: { admissible: true, evidence: { id: 'housing-au-scenario', estimate: 0.42, unit: 'absolute stable-housing probability difference', uncertainty: { low: 0.30, high: 0.54 }, jurisdiction: 'Australia', mode: 'site-supported-scenario' } } } } }
  },
  {
    id: 'melbourne-transportability-block',
    description: 'Explicitly deny transportability in Melbourne; the decision must remain failure-closed.',
    options: { scenarioEvidence: { Melbourne: { housing: { admissible: false, failure: 'causal-effect-not-transportable-to-city' } } } }
  }
];

function summarize(result) {
  return result.comparison.map(city => ({
    city: city.city,
    state: city.state,
    recommendation: city.recommendation,
    observedValue: city.observedValue,
    optimization: city.optimization
  }));
}

async function runExperiment(experiment) {
  const result = await runAll({ ...experiment.options, fetchImpl: cachedFetch });
  const byCity = Object.fromEntries(result.cities.map(city => [city.city, city]));
  return {
    id: experiment.id,
    description: experiment.description,
    summary: summarize(result),
    learning: Object.fromEntries(result.cities.filter(city => city.learning).map(city => [city.city, city.learning])),
    transportability: Object.fromEntries(result.cities.map(city => [city.city, city.audit.causalTransportability])),
    assertions: {
      baselineShape: result.cities.length === 3,
      OttawaLiveObservation: byCity.Ottawa.observedContext.value === 2952,
      TorontoLiveObservation: byCity.Toronto.observedContext.value === 15400,
      MelbourneLiveObservation: byCity.Melbourne.observedContext.value === 147
    }
  };
}

async function main() {
  const results = [];
  for (const experiment of EXPERIMENTS) results.push(await runExperiment(experiment));

  const byId = Object.fromEntries(results.map(result => [result.id, result]));
  const expected = {
    baseline: byId['baseline-three-city'].summary,
    outcomeWithinToleranceDrift: byId['ottawa-outcome-within-tolerance'].learning.Ottawa.drift.detected === false,
    outcomeDriftDetected: byId['ottawa-outcome-drift'].learning.Ottawa.drift.detected === true,
    interventionFlip: byId['ottawa-competing-intervention-flip'].summary.find(city => city.city === 'Ottawa').recommendation === 'ase',
    melbourneUnlock: byId['melbourne-transportability-unlock'].summary.find(city => city.city === 'Melbourne').recommendation === 'housing',
    melbourneBlocked: byId['melbourne-transportability-block'].summary.find(city => city.city === 'Melbourne').state === 'BLOCKED'
  };

  const liveAssertions = results.every(result => Object.values(result.assertions).every(Boolean));
  const passed = liveAssertions && Object.values(expected).slice(1).every(Boolean);
  const output = { schemaVersion: 'vidik.experiment-suite.v1', passed, liveCacheSize: LIVE_CACHE.size, expected, results };
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  if (!passed) process.exitCode = 1;
}

if (require.main === module) main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
module.exports = { EXPERIMENTS, runExperiment, main };
