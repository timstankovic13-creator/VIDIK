'use strict';

const crypto = require('node:crypto');

const EVIDENCE_TYPES = ['causal', 'implementation', 'cost', 'equity'];

function normalize(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function tokenise(value) { return normalize(value).toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean).slice(0, 24); }

function buildEvidenceQueries({ problem, candidate, jurisdiction = null } = {}) {
  if (!normalize(problem)) throw new Error('evidence-discovery-problem-required');
  if (!candidate?.id || !normalize(candidate.name)) throw new Error('evidence-discovery-candidate-required');
  const problemTokens = tokenise(problem);
  const candidateTokens = tokenise(`${candidate.name} ${candidate.discoveryText || ''}`);
  const jurisdictionToken = normalize(jurisdiction);
  const base = [...new Set([...problemTokens, ...candidateTokens])].slice(0, 18).join(' ');
  return EVIDENCE_TYPES.map(type => ({
    evidenceType: type,
    query: normalize(`${base} ${jurisdictionToken} ${type} evidence`),
    candidateId: candidate.id,
    importedEffect: false,
    discoveryOnly: true
  }));
}

function classifyEvidenceCoverage({ candidate, evidence = {} } = {}) {
  const required = Array.isArray(candidate?.requiredEvidence) && candidate.requiredEvidence.length
    ? candidate.requiredEvidence
    : EVIDENCE_TYPES;
  const coverage = {};
  for (const type of required) {
    const item = evidence[type];
    const status = typeof item === 'string' ? item : item?.status;
    coverage[type] = {
      status: ['verified', 'supported', 'estimated', 'potential', 'blocked'].includes(status) ? status : 'missing',
      sourceIds: Array.isArray(item?.sourceIds) ? item.sourceIds : [],
      causalIdentified: Boolean(item?.causalIdentified)
    };
  }
  const missing = required.filter(type => coverage[type].status === 'missing' || coverage[type].status === 'blocked');
  const hasCausal = coverage.causal?.status === 'verified' || coverage.causal?.status === 'supported';
  const recommendationEligible = missing.length === 0 && hasCausal && required.every(type => ['verified', 'supported'].includes(coverage[type].status));
  return { required, coverage, missing, recommendationEligible };
}

function buildEvidenceDiscoveryRequest({ problem, candidate, jurisdiction = null } = {}) {
  const queries = buildEvidenceQueries({ problem, candidate, jurisdiction });
  const request = {
    schemaVersion: 'vidik.evidence-discovery-gateway.v1',
    problem,
    candidateId: candidate.id,
    candidateName: candidate.name,
    jurisdiction,
    queries,
    effectsImported: false,
    recommendationEligible: false
  };
  request.requestHash = crypto.createHash('sha256').update(JSON.stringify(request)).digest('hex');
  return request;
}

module.exports = { EVIDENCE_TYPES, buildEvidenceQueries, classifyEvidenceCoverage, buildEvidenceDiscoveryRequest };
