'use strict';

const { sha256 } = require('./data-acquisition');

const REQUIRED_PARAMETER_FIELDS = ['estimate', 'unit', 'uncertainty'];

function hasFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function uncertaintyIsValid(uncertainty) {
  if (!uncertainty || typeof uncertainty !== 'object') return false;
  const low = uncertainty.low;
  const high = uncertainty.high;
  if (!hasFiniteNumber(low) || !hasFiniteNumber(high) || low > high) return false;
  return true;
}

function verificationSourceMatchesLead(verification, lead) {
  return Boolean(
    verification &&
    lead &&
    verification.sourceId &&
    verification.sourceId === lead.sourceId &&
    verification.externalId &&
    lead.provenance?.externalId &&
    verification.externalId === lead.provenance.externalId
  );
}

function assessEvidencePromotion({ lead, verification, targetJurisdiction, requiredEvidence = ['causal', 'implementation', 'cost', 'equity'] } = {}) {
  const reasons = [];
  const safeLead = lead && typeof lead === 'object' ? lead : null;
  const safeVerification = verification && typeof verification === 'object' ? verification : null;

  if (!safeLead || !safeLead.evidenceLeadOnly) reasons.push('not-an-evidence-lead');
  if (safeLead?.causalEffectImported === true) reasons.push('effect-already-imported');
  if (!safeVerification) reasons.push('independent-verification-missing');
  if (safeVerification?.verified !== true) reasons.push('independent-verification-not-confirmed');
  if (safeVerification && !verificationSourceMatchesLead(safeVerification, safeLead)) reasons.push('verification-source-mismatch');
  if (safeVerification?.evidenceType !== 'causal') reasons.push('causal-evidence-not-established');
  if (targetJurisdiction && safeVerification?.targetJurisdiction !== targetJurisdiction) reasons.push('target-jurisdiction-mismatch');
  if (safeVerification?.transportability?.admissible !== true) reasons.push('transportability-not-admissible');
  if (safeVerification?.localEvidenceBoundary !== 'explicit') reasons.push('local-evidence-boundary-not-explicit');

  const parameter = safeVerification?.parameter;
  for (const field of REQUIRED_PARAMETER_FIELDS) {
    if (field === 'estimate' && !hasFiniteNumber(parameter?.estimate)) reasons.push('parameter-estimate-missing');
    if (field === 'unit' && !String(parameter?.unit || '').trim()) reasons.push('parameter-unit-missing');
    if (field === 'uncertainty' && !uncertaintyIsValid(parameter?.uncertainty)) reasons.push('parameter-uncertainty-missing-or-invalid');
  }

  const required = [...new Set(requiredEvidence)];
  const verifiedEvidence = new Set(Array.isArray(safeVerification?.verifiedEvidence) ? safeVerification.verifiedEvidence : []);
  for (const evidenceType of required) if (!verifiedEvidence.has(evidenceType)) reasons.push(`required-evidence-not-verified:${evidenceType}`);

  const eligible = reasons.length === 0;
  const promotion = eligible ? {
    status: 'verified-parameter',
    candidateId: safeLead?.candidateId || null,
    sourceId: safeLead?.sourceId || null,
    externalId: safeLead?.provenance?.externalId || null,
    evidenceType: 'causal',
    parameter: {
      estimate: parameter.estimate,
      unit: parameter.unit,
      uncertainty: { low: parameter.uncertainty.low, high: parameter.uncertainty.high }
    },
    targetJurisdiction: safeVerification.targetJurisdiction,
    sourceJurisdiction: safeVerification.sourceJurisdiction || null,
    verificationId: safeVerification.verificationId || null
  } : null;

  return {
    schemaVersion: 'vidik.evidence-promotion-gate.v1',
    eligible,
    recommendationEligible: false,
    reasons,
    evidenceLeadOnly: !eligible,
    effectsImported: false,
    verifiedParameter: promotion,
    gateHash: sha256({ leadId: safeLead?.id || null, verification: safeVerification, eligible, reasons })
  };
}

function promoteVerifiedParameter(args = {}) {
  const gate = assessEvidencePromotion(args);
  if (!gate.eligible) return gate;
  return { ...gate, recommendationEligible: false, verifiedParameter: { ...gate.verifiedParameter, recommendationEligible: false } };
}

module.exports = { REQUIRED_PARAMETER_FIELDS, uncertaintyIsValid, verificationSourceMatchesLead, assessEvidencePromotion, promoteVerifiedParameter };
