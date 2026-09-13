'use strict';
const assert = require('assert');
const { acquireDecisionEvidence, buildEvidenceAcquisitionTasks, buildGovernedDiscoveryPlan, buildInterventionUniverseSources, buildDiscoveryQueries, CORE_REQUIRED_DOMAINS } = require('../js/evidence-acquisition-orchestrator');
const { CANDIDATE_REGISTRY } = require('../js/intervention-discovery');

function response(body, contentType='text/html') {
  const bytes = Buffer.from(body);
  return { status: 200, ok: true, headers: { get(name) { return name.toLowerCase()==='content-type' ? contentType : String(bytes.length); } }, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
}

(async () => {
  assert.strictEqual(CORE_REQUIRED_DOMAINS.length, 8);
  const tasks = buildEvidenceAcquisitionTasks({ problem: 'reduce violent crime', geography: 'Ottawa', candidates: [{ id:'violence-interruption', missingEvidence:['causal','implementation','cost','equity','safety'] }] });
  assert.strictEqual(tasks.length, 5);
  assert(tasks.some(x => x.domain === 'causal-evidence'));
  assert(tasks.some(x => x.domain === 'cost-resource'));
  assert(tasks.some(x => x.domain === 'population-equity'));

  const governedPlan = buildGovernedDiscoveryPlan({ objective:'reduce harm', problem:'reduce violent crime', geography:'Ottawa' });
  assert(governedPlan.steps.some(step => step.domain === 'causal-evidence' && step.status === 'SOURCE_FOUND'), 'violent-crime planning must discover causal evidence sources');
  assert(governedPlan.steps.some(step => step.domain === 'intervention-universe' && step.status === 'SOURCE_FOUND'), 'planning must discover intervention-universe sources');
  assert(governedPlan.sourceDiscovery.ranked.some(source => source.provider === 'OpenAlex'));
  assert(governedPlan.sourceDiscovery.ranked.some(source => source.provider === 'Campbell Collaboration Crime and Justice'));

  const autoSources = buildInterventionUniverseSources({ problem:'reduce violent crime', geography:'Ottawa' });
  assert(autoSources.length >= 2, 'discovery should use multiple governed query variants');
  assert(autoSources.every(source => source.domain === 'intervention-universe'));
  assert(autoSources.some(source => source.url.includes('q=reduce+violent+crime+Ottawa')));
  assert(buildDiscoveryQueries({ problem:'reduce emergency department overcrowding', geography:'Ottawa' }).some(query => query.includes('emergency department overcrowding')));
  const arbitraryDomainSources = buildInterventionUniverseSources({ problem:'reduce emergency department overcrowding', geography:'Ottawa' });
  assert(arbitraryDomainSources.length >= 1, 'arbitrary problem domains must not lose all governed discovery sources because tags are unknown');

  const localSource = { url:'https://city.example/local', provider:'Test City', jurisdiction:'Ottawa', domain:'local-baseline', tier:'official_publication', observation:{value:123,unit:'people',period:'2026-01-01',asOf:'2026-01-01',aggregation:'point-in-time',extractionMethod:'test'} };
  const causalSource = { url:'https://research.example/effect', provider:'Independent Research', jurisdiction:'Canada', domain:'causal-evidence', tier:'independent_causal_research', evidence:{id:'test-effect',estimate:0.25,unit:'absolute risk difference',asOf:'2026-01-01',uncertainty:{low:0.1,high:0.4},provenance:'test causal record'} };
  const fakeFetch = async url => {
    if (url.includes('package_search')) return response(JSON.stringify({ result: { results: [
      { id:'external-violence-program', title:'Community violence prevention', type:'program', tags:['violent-crime'], category:'public-safety' },
      { id:'external-unmatched-program', title:'Coastal flood barrier initiative', type:'program', tags:['flooding'], category:'environment' }
    ] } }), 'application/json');
    return response(url.includes('effect') ? 'causal evidence snapshot' : 'local baseline snapshot');
  };
  const result = await acquireDecisionEvidence({ objective:'reduce harm', problem:'reduce violent crime', geography:'Ottawa', localSource, causalSources:[causalSource], candidateRegistry:CANDIDATE_REGISTRY, evidenceIndex:{}, fetchImpl:fakeFetch, now:new Date('2026-09-12T00:00:00Z') });
  assert.strictEqual(result.records.length, 2);
  assert(result.interventionUniverse.some(x => x.id === 'violence-interruption'));
  assert(result.interventionUniverse.some(x => x.id === 'external-violence-program'), 'automatic catalog discovery must feed the intervention universe');
  assert(result.governedInterventionSources.length >= 2);
  assert(result.governedInterventionSources.every(source => source.discoveryQuery), 'each governed discovery request must retain its query provenance');
  assert(result.discoveryDiagnostics.unmatched.some(x => x.id === 'external-unmatched-program'), 'discovered but non-matching interventions must remain auditable rather than disappearing');
  assert(result.acquisitionTasks.some(x => x.candidateId === 'external-violence-program'));
  assert(result.candidateUniverseHash);
  assert(result.acquisitionPlanHash);
  assert(result.gaps.length > 0);
  assert(result.coverage.missingDomains.includes('implementation'));
  console.log('evidence-acquisition-orchestrator tests passed');
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
