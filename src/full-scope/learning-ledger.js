'use strict';

const { auditHash } = require('./decision-engine');
const { outcomeReview, detectDrift, registerFailure } = require('./learning-engine');

const text = x => String(x ?? '').trim();
const clone = x => JSON.parse(JSON.stringify(x));

async function createLearningLedger(input = {}) {
  if (!text(input.problem)) throw new Error('learning-ledger-problem-required');
  const ledger = {
    schemaVersion:'vidik.learning-ledger.v1',
    problem:text(input.problem),
    candidateId:text(input.candidateId) || null,
    baselineArtifactHash:text(input.baselineArtifactHash) || null,
    entries:[],
    parameterMutationAllowed:false,
    automaticParameterUpdate:false
  };
  ledger.ledgerHash = await auditHash(ledger);
  return Object.freeze(ledger);
}

async function appendOutcome(ledger, expected, observed, metadata = {}) {
  if (!ledger || ledger.schemaVersion !== 'vidik.learning-ledger.v1') throw new Error('learning-ledger-invalid');
  const review = outcomeReview(expected, observed);
  if (!review.valid) throw new Error(`learning-outcome-invalid:${review.reason}`);
  const next = clone(ledger);
  const entry = {
    type:'outcome-review',
    id:text(metadata.reviewId) || `review:${next.entries.length + 1}`,
    recordedAt:text(metadata.recordedAt) || new Date().toISOString(),
    review,
    provenance:text(metadata.provenance) || null,
    parameterMutationAllowed:false
  };
  next.entries.push(entry);
  next.parameterMutationAllowed = false;
  next.automaticParameterUpdate = false;
  delete next.ledgerHash;
  next.ledgerHash = await auditHash(next);
  return Object.freeze(next);
}

async function appendFailure(ledger, failureInput = {}) {
  if (!ledger || ledger.schemaVersion !== 'vidik.learning-ledger.v1') throw new Error('learning-ledger-invalid');
  const next = clone(ledger);
  const failure = registerFailure(failureInput);
  next.entries.push({type:'failure',id:failure.id,recordedAt:new Date().toISOString(),failure:clone(failure),parameterMutationAllowed:false});
  next.parameterMutationAllowed = false;
  next.automaticParameterUpdate = false;
  delete next.ledgerHash;
  next.ledgerHash = await auditHash(next);
  return Object.freeze(next);
}

function reviewDrift(ledger, threshold = 0.2) {
  if (!ledger || ledger.schemaVersion !== 'vidik.learning-ledger.v1') return {valid:false,reason:'learning-ledger-invalid'};
  const history = ledger.entries.filter(e => e.type === 'outcome-review').map(e => ({
    reviewId:e.id,
    expectedEffect:e.review.expectedEffect,
    observedEffect:e.review.observedEffect,
    unit:e.review.effectUnit
  }));
  return {...detectDrift(history, threshold), parameterMutationAllowed:false, automaticParameterUpdate:false};
}

async function validateLearningLedger(ledger) {
  if (!ledger || ledger.schemaVersion !== 'vidik.learning-ledger.v1' || !Array.isArray(ledger.entries)) return {valid:false,reason:'learning-ledger-schema-invalid'};
  if (ledger.parameterMutationAllowed === true || ledger.automaticParameterUpdate === true) return {valid:false,reason:'automatic-learning-mutation-forbidden'};
  if (!text(ledger.ledgerHash)) return {valid:false,reason:'learning-ledger-hash-missing'};
  const copy = clone(ledger);
  delete copy.ledgerHash;
  const recomputed = await auditHash(copy);
  return {valid:recomputed === ledger.ledgerHash,reason:recomputed === ledger.ledgerHash ? 'valid' : 'learning-ledger-tampered'};
}

module.exports = { createLearningLedger, appendOutcome, appendFailure, reviewDrift, validateLearningLedger };
