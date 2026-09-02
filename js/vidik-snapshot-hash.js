'use strict';

const crypto = require('node:crypto');

function normalize(value) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new TypeError('Snapshot contains non-finite number');
    return value;
  }
  if (Array.isArray(value)) return value.map(normalize);
  return Object.keys(value).sort().reduce((out, key) => {
    out[key] = normalize(value[key]);
    return out;
  }, {});
}

function stableSerialize(value) {
  return JSON.stringify(normalize(value));
}

function snapshotHash(value) {
  return crypto.createHash('sha256').update(stableSerialize(value), 'utf8').digest('hex');
}

module.exports = { stableSerialize, snapshotHash };
