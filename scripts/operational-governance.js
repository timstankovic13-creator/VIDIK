'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const CHECKPOINTS = Object.freeze({ '6-month': 6, '1-year': 12, '2-year': 24, '5-year': 60 });
const SCHEMA = 'VIDIK.OperationalGovernance.v1';

function fail(code, detail) { const error = new Error(detail ? `${code}: ${detail}` : code); error.code = code; throw error; }
function iso(value, field) { const date = new Date(value); if (!Number.isFinite(date.getTime())) fail(`invalid-${field}`); return date.toISOString(); }
function stable(value) { if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`; if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`; return JSON.stringify(value); }
function hash(value) { return crypto.createHash('sha256').update(stable(value)).digest('hex'); }
function seal(state, previousHash = '') { const payload = JSON.parse(JSON.stringify(state)); delete payload.integrity; state.integrity = { schema: SCHEMA, algorithm: 'SHA-256', previousHash, contentHash: hash(payload) }; return state; }
function verify(state) { if (!state || state.schema !== SCHEMA || state.version !== 1 || !Array.isArray(state.reviews) || !Array.isArray(state.recalibrationDecisions) || !Array.isArray(state.failures)) fail('invalid-governance-store'); if (!state.integrity?.contentHash) fail('missing-governance-integrity'); const payload = JSON.parse(JSON.stringify(state)); delete payload.integrity; if (hash(payload) !== state.integrity.contentHash) fail('governance-store-integrity-mismatch'); return state; }
function empty() { return seal({ schema: SCHEMA, version: 1, reviews: [], recalibrationDecisions: [], failures: [] }); }
function read(filePath) { if (!fs.existsSync(filePath)) return empty(); let state; try { state = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (error) { fail('corrupt-governance-store', error.message); } return verify(state); }
function write(filePath, state, previousHash) { fs.mkdirSync(path.dirname(filePath), { recursive: true }); const temp = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`; seal(state, previousHash); try { fs.writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, { flag: 'wx' }); fs.renameSync(temp, filePath); } finally { try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch {} } }
function transaction(filePath, mutator) { const state = read(filePath); const previousHash = state.integrity.contentHash; const result = mutator(state); write(filePath, state, previousHash); return result; }
function dueAt(decisionAt, checkpoint) { const d = new Date(decisionAt); d.setUTCMonth(d.getUTCMonth() + CHECKPOINTS[checkpoint]); return d.toISOString(); }

function createOperationalGovernanceStore(options = {}) {
  const filePath = options.filePath || path.join(process.cwd(), 'data', 'operational-governance.json');
  return {
    filePath,
    snapshot() { return read(filePath); },
    verifyIntegrity() { const state = read(filePath); return { ok: true, contentHash: state.integrity.contentHash, previousHash: state.integrity.previousHash }; },
    scheduleReview(input = {}) {
      if (!input.decisionId || typeof input.decisionId !== 'string') fail('invalid-decision-id');
      if (!Object.hasOwn(CHECKPOINTS, input.checkpoint)) fail('invalid-checkpoint');
      const decisionAt = iso(input.decisionAt, 'decision-at');
      const review = { id: crypto.randomUUID(), decisionId: input.decisionId, checkpoint: input.checkpoint, dueAt: dueAt(decisionAt, input.checkpoint), status: 'SCHEDULED', createdAt: new Date().toISOString() };
      return transaction(filePath, state => { if (state.reviews.some(r => r.decisionId === review.decisionId && r.checkpoint === review.checkpoint)) fail('duplicate-review'); state.reviews.push(review); return review; });
    },
    reviewStatus(decisionId, now = new Date()) {
      const state = read(filePath); const nowIso = iso(now, 'now');
      return state.reviews.filter(r => r.decisionId === decisionId).map(r => ({ ...r, effectiveStatus: r.status === 'COMPLETED' ? 'COMPLETED' : (new Date(nowIso) >= new Date(r.dueAt) ? 'OVERDUE' : r.status) }));
    },
    completeReview(reviewId, input = {}) {
      const reviewedAt = iso(input.reviewedAt || new Date().toISOString(), 'reviewed-at');
      return transaction(filePath, state => { const review = state.reviews.find(r => r.id === reviewId); if (!review) fail('review-not-found'); if (review.status === 'COMPLETED') fail('review-already-completed'); review.status = 'COMPLETED'; review.reviewedAt = reviewedAt; review.finding = input.finding || null; return review; });
    },
    proposeRecalibration(input = {}) {
      if (!input.decisionId || !input.parameterName) fail('invalid-recalibration-target');
      return transaction(filePath, state => { const proposal = { id: crypto.randomUUID(), decisionId: input.decisionId, parameterName: input.parameterName, proposedValue: input.proposedValue, basis: input.basis || 'outcome-learning-signal', status: 'PROPOSED', createdAt: new Date().toISOString() }; state.recalibrationDecisions.push(proposal); return proposal; });
    },
    decideRecalibration(id, decision, input = {}) {
      if (!['APPROVED', 'REJECTED', 'OVERRIDDEN'].includes(decision)) fail('invalid-recalibration-decision');
      return transaction(filePath, state => { const item = state.recalibrationDecisions.find(r => r.id === id); if (!item) fail('recalibration-not-found'); if (item.status !== 'PROPOSED') fail('recalibration-already-decided'); item.status = decision; item.decidedAt = new Date().toISOString(); item.decidedBy = input.decidedBy || 'human'; item.reason = input.reason || null; return item; });
    },
    recordFailure(input = {}) {
      if (!input.code || !input.description) fail('invalid-failure');
      return transaction(filePath, state => { const failure = { id: crypto.randomUUID(), code: input.code, description: input.description, severity: input.severity || 'unknown', decisionId: input.decisionId || null, detectedAt: input.detectedAt ? iso(input.detectedAt, 'detected-at') : new Date().toISOString(), status: 'OPEN' }; state.failures.push(failure); return failure; });
    },
    closeFailure(id, reason) { return transaction(filePath, state => { const failure = state.failures.find(f => f.id === id); if (!failure) fail('failure-not-found'); failure.status = 'CLOSED'; failure.closedAt = new Date().toISOString(); failure.resolution = reason || null; return failure; }); }
  };
}

module.exports = { CHECKPOINTS, SCHEMA, createOperationalGovernanceStore };
