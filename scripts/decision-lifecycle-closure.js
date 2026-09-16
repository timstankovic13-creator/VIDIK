'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { readStore: readArtifacts, verifyChain: verifyArtifactChain } = require('../js/decision-artifact-store');
const { createOutcomeLearningStore } = require('./outcome-learning');

const VERSION = 1;
const stable = value => Array.isArray(value)
  ? `[${value.map(stable).join(',')}]`
  : (value && typeof value === 'object'
    ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`
    : JSON.stringify(value));
const hash = value => crypto.createHash('sha256').update(stable(value)).digest('hex');

function emptyState() {
  const body = { version: VERSION, records: [] };
  return { ...body, integrity: hash(body) };
}

function readLineage(filePath) {
  if (!fs.existsSync(filePath)) return emptyState();
  let state;
  try { state = JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (error) { throw new Error(`lifecycle-lineage-corrupt: ${error.message}`); }
  if (!state || state.version !== VERSION || !Array.isArray(state.records) || typeof state.integrity !== 'string') {
    throw new Error('lifecycle-lineage-invalid');
  }
  const body = { version: state.version, records: state.records };
  if (hash(body) !== state.integrity) throw new Error('lifecycle-lineage-integrity-mismatch');
  return state;
}

function writeLineage(filePath, state) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const body = { version: state.version, records: state.records };
  const next = { ...body, integrity: hash(body) };
  const temp = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temp, `${JSON.stringify(next, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    fs.renameSync(temp, filePath);
  } finally {
    try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch {}
  }
  return next;
}

function findVerifiedArtifact(artifactFile, decisionId) {
  const records = readArtifacts(artifactFile);
  const chain = verifyArtifactChain(records);
  if (!chain.ok) throw new Error(`decision-artifact-chain-invalid: ${chain.reason}`);
  const matches = records.filter(record => record.artifact?.decisionId === decisionId);
  if (matches.length !== 1) throw new Error(matches.length ? 'decision-artifact-ambiguous' : 'decision-artifact-missing');
  return matches[0];
}

function verifyLifecycle({ artifactFile, outcomeFile, lineageFile }) {
  const artifactRecords = readArtifacts(artifactFile);
  const artifactChain = verifyArtifactChain(artifactRecords);
  if (!artifactChain.ok) return { ok: false, reason: `decision-artifact-chain-invalid:${artifactChain.reason}` };
  const learning = createOutcomeLearningStore({ filePath: outcomeFile });
  let learningState;
  try { learningState = learning.snapshot(); }
  catch (error) { return { ok: false, reason: error.message }; }
  let lineage;
  try { lineage = readLineage(lineageFile); }
  catch (error) { return { ok: false, reason: error.message }; }
  const artifactByDecision = new Map(artifactRecords.map(record => [record.artifact.decisionId, record.artifact.integrity.contentHash]));
  for (const record of lineage.records) {
    if (artifactByDecision.get(record.decisionId) !== record.decisionArtifactHash) {
      return { ok: false, reason: `lineage-artifact-mismatch:${record.outcomeId}` };
    }
    if (!learningState.outcomes.some(outcome => outcome.id === record.outcomeId && outcome.decisionId === record.decisionId)) {
      return { ok: false, reason: `lineage-outcome-missing:${record.outcomeId}` };
    }
  }
  return { ok: true, artifactChain, outcomeCount: learningState.outcomes.length, lineageCount: lineage.records.length, lineageHash: lineage.integrity };
}

function linkOutcome({ artifactFile, outcomeFile, lineageFile, outcomeId, decisionId }) {
  if (!outcomeId || !decisionId) throw new Error('lifecycle-link-identifiers-required');
  const artifact = findVerifiedArtifact(artifactFile, decisionId);
  const learning = createOutcomeLearningStore({ filePath: outcomeFile });
  const state = learning.snapshot();
  const outcome = state.outcomes.find(item => item.id === outcomeId && item.decisionId === decisionId);
  if (!outcome) throw new Error('outcome-for-lifecycle-link-missing');
  const current = readLineage(lineageFile);
  if (current.records.some(item => item.outcomeId === outcomeId)) throw new Error('duplicate-lifecycle-link');
  current.records.push({
    outcomeId,
    decisionId,
    parameterName: outcome.parameterName,
    checkpoint: outcome.checkpoint,
    decisionArtifactHash: artifact.artifact.integrity.contentHash,
    linkedAt: new Date().toISOString()
  });
  return writeLineage(lineageFile, current);
}

module.exports = { VERSION, readLineage, verifyLifecycle, linkOutcome, findVerifiedArtifact };
