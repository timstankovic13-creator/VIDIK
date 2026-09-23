'use strict';

const MONEY_PATTERN = /(?:\$\s*)?(\d+(?:[.,]\d+)?)(?:\s*)(trillion|tn|t|billion|bn|b|million|mn|m|thousand|k)?/ig;
const MULTIPLIERS = Object.freeze({
  k: 1e3, thousand: 1e3, m: 1e6, mn: 1e6, million: 1e6,
  b: 1e9, bn: 1e9, billion: 1e9, t: 1e12, tn: 1e12, trillion: 1e12
});
function parseMoney(text) {
  const raw = String(text || '');
  let match; let best = null;
  while ((match = MONEY_PATTERN.exec(raw))) {
    const number = Number(match[1].replace(/,/g, ''));
    if (!Number.isFinite(number)) continue;
    const unit = String(match[2] || '').toLowerCase();
    const amount = number * (MULTIPLIERS[unit] || 1);
    if (!best || amount > best.amount) best = { amount, currency: /\$/.test(match[0]) ? 'CAD' : null, raw: match[0] };
  }
  return best;
}
function detectBudgetIntent(text) {
  const raw = String(text || '').trim();
  const lower = raw.toLowerCase();
  const amount = parseMoney(raw);
  const fullBudget = /\b(full|entire|whole|total|overall)\s+(?:municipal\s+)?budget\b|\ball\s+(?:municipal\s+)?budget\b/.test(lower);
  const optimization = /\b(optimi[sz](?:e|ation)|allocate|allocation|reallocate|resource allocation|budget allocation|spend|spending)\b/.test(lower);
  const valuePreservation = /\b(?:dollars?|resources?|spending)\b[\s\S]{0,80}\b(?:lose|waste|value|marginal)\b|\b(?:lose|waste|preserve|protect)\b[\s\S]{0,80}\b(?:value|dollar|return)\b/.test(lower);
  const singleDecision = /\b(?:should we|decide whether|one decision|single decision|fund|spend)\b[\s\S]{0,100}(?:\$|million|billion|thousand|on)\b/.test(lower);
  let scope = 'single-decision';
  if (fullBudget) scope = 'full-budget';
  else if (singleDecision) scope = 'single-decision';
  else if (optimization || amount) scope = 'portfolio';
  return { requested:Boolean(fullBudget||optimization||valuePreservation||amount),scope,amount:amount?.amount||null,currency:amount?.currency||null,objective:valuePreservation?'preserve-marginal-dollar-value':(optimization?'optimize-resource-allocation':null),fullBudget,optimizationRequested:optimization,valuePreservationRequested:valuePreservation };
}
module.exports = { parseMoney, detectBudgetIntent };
