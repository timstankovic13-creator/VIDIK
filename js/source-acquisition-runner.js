'use strict';
const { buildAcquisitionPlan, retrieve } = require('./data-acquisition');
async function acquireRankedSources({ manifest, candidates = [], fetchImpl = globalThis.fetch, now = new Date(), options = {} } = {}) {
  const plan = buildAcquisitionPlan({ manifest, candidates });
  const acquired = [], failures = [];
  for (const step of plan.steps) {
    let success = false;
    for (const source of step.sources) {
      try {
        const descriptor = candidates.find(candidate => candidate.url === source.url && candidate.domain === source.domain);
        if (!descriptor) throw new Error('source-descriptor-not-found');
        const snapshot = await retrieve(descriptor, { fetchImpl, now, ...options });
        acquired.push({ requirementId: step.requirementId, domain: step.domain, source: descriptor, retrieval: snapshot.retrieval, bytes: snapshot.bytes });
        success = true;
        break;
      } catch (error) {
        failures.push({ requirementId: step.requirementId, domain: step.domain, sourceUrl: source.url, reason: error.message });
      }
    }
    if (!success) failures.push({ requirementId: step.requirementId, domain: step.domain, reason: step.sources.length ? 'all-ranked-sources-failed' : 'no-source-candidate' });
  }
  const uncovered = plan.steps.filter(step => !acquired.some(item => item.requirementId === step.requirementId));
  return {
    schemaVersion: 'vidik.source-acquisition-run.v1', plan,
    acquired: acquired.map(item => ({ requirementId: item.requirementId, domain: item.domain, source: item.source, retrieval: item.retrieval })),
    snapshots: acquired.map(item => item.retrieval), failures,
    complete: uncovered.length === 0,
    degraded: failures.length > 0,
    uncoveredRequirements: uncovered.map(step => ({ requirementId: step.requirementId, domain: step.domain }))
  };
}
module.exports = { acquireRankedSources };
