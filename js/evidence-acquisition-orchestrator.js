'use strict';

const {
  requiredDataManifest,
  retrieve,
  normalizeRecord,
  validateRecord,
  buildAcquisitionResult,
  sha256
} = require('./data-acquisition');
const { discoverInterventions, evidenceCoverage, hashCandidateUniverse } = require('./intervention-discovery');

const CORE_REQUIRED_DOMAINS = Object.freeze([
  'problem-outcome',
  'local-baseline',
  'population-equity',
  'intervention-universe',
  'implementation',
  'cost-resource',
  'causal-evidence',
  'constraints-feasibility'
]);

function buildEvidenceAcquisitionTasks({ problem, geography, candidates = [] } = {}) {
  if (!problem || !geography) throw new Error('evidence-acquisition-task-context-required');
  const tasks = [];
  for (const candidate of candidates) {
    for (const evidenceType of candidate.missingEvidence || []) {
      const domain = evidenceType === 'causal' ? 'causal-evidence'
        : evidenceType === 'implementation' ? 'implementation'
        : evidenceType === 'cost' ? 'cost-resource'
        : evidenceType === 'equity' ? 'population-equity'
        : evidenceType === 'safety' ? 'constraints-feasibility'
        : 'intervention-universe';
      tasks.push({
        id: `ACQ-${candidate.id}-${evidenceType}`,
        candidateId: candidate.id,
        evidenceType,
        domain,
        geography,
        problem,
        status: 'OPEN',
        priority: evidenceType === 'causal' ? 'critical' : 'required',
        query: `${candidate.id} ${problem} ${geography} ${evidenceType} evidence`
      });
    }
  }
  return tasks;
}

async function acquireDecisionEvidence({
  objective,
  problem,
  geography,
  localSource,
  causalSources = [],
  candidateRegistry,
  localProgramIndex = [],
  evidenceIndex = {},
  fetchImpl,
  now = new Date()
} = {}) {
  if (!objective || !problem || !geography || !localSource) throw new Error('decision-evidence-acquisition-context-required');
  const manifest = requiredDataManifest({ objective, problem, geography, domains: CORE_REQUIRED_DOMAINS });
  const candidates = discoverInterventions({ problem, candidates: candidateRegistry, localProgramIndex, evidenceIndex });
  const sources = [localSource, ...causalSources];
  const records = [];
  const snapshots = [];
  const failures = [];

  for (const source of sources) {
    try {
      const snapshot = await retrieve(source, { fetchImpl, now });
      snapshots.push(snapshot.retrieval);
      if (source.domain === 'local-baseline') {
        const local = source.observation;
        if (local) {
          const record = normalizeRecord({
            source,
            retrieval: snapshot.retrieval,
            value: local.value,
            unit: local.unit,
            period: local.period || local.asOf || 'source-reported-period',
            geography,
            aggregation: local.aggregation || 'source-reported',
            extractionMethod: local.extractionMethod || 'municipal-adapter',
            definition: local.definition || null,
            asOf: local.asOf || null
          });
          const validation = validateRecord(record, { now });
          records.push({ ...record, status: validation.valid ? 'supported' : 'blocked', validation });
          if (!validation.valid) failures.push(...validation.failures.map(reason => `${source.url}:${reason}`));
        }
      } else if (source.domain === 'causal-evidence' && source.evidence) {
        const evidence = source.evidence;
        const record = normalizeRecord({
          source,
          retrieval: snapshot.retrieval,
          value: evidence.estimate,
          unit: evidence.unit,
          period: evidence.asOf || 'source-reported-period',
          geography: evidence.targetJurisdiction || geography,
          aggregation: 'causal-effect-estimate',
          extractionMethod: evidence.extractionMethod || 'registered-causal-evidence',
          definition: evidence.provenance || null,
          asOf: evidence.asOf || null,
          quality: evidence.quality || null
        });
        const validation = validateRecord(record, { now });
        records.push({
          ...record,
          status: validation.valid ? 'supported' : 'blocked',
          causal: true,
          evidenceId: evidence.id,
          uncertainty: evidence.uncertainty || null,
          validation
        });
        if (!validation.valid) failures.push(...validation.failures.map(reason => `${source.url}:${reason}`));
      }
    } catch (error) {
      failures.push(`${source.url}:${error.message}`);
    }
  }

  const acquisitionTasks = buildEvidenceAcquisitionTasks({ problem, geography, candidates });
  const gaps = acquisitionTasks.map(task => `${task.id}:${task.domain}`);
  const result = buildAcquisitionResult({
    manifest,
    candidates: sources,
    records,
    gaps,
    failures,
    snapshots,
    interventionUniverse: candidates
  });
  return {
    ...result,
    candidateCoverage: evidenceCoverage(candidates),
    candidateUniverseHash: hashCandidateUniverse(candidates),
    acquisitionTasks,
    acquisitionPlanHash: sha256({ manifest: result.manifest, tasks: acquisitionTasks, candidates: candidates.map(x => x.id) })
  };
}

module.exports = {
  CORE_REQUIRED_DOMAINS,
  buildEvidenceAcquisitionTasks,
  acquireDecisionEvidence
};
