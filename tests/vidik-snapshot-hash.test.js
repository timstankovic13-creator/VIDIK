'use strict';

const assert = require('node:assert/strict');
const { stableSerialize, snapshotHash } = require('../js/vidik-snapshot-hash');

const a = { z: 1, nested: { b: 2, a: 1 }, list: [{ y: 2, x: 1 }] };
const b = { list: [{ x: 1, y: 2 }], nested: { a: 1, b: 2 }, z: 1 };

assert.equal(stableSerialize(a), stableSerialize(b));
assert.equal(snapshotHash(a), snapshotHash(b));
assert.notEqual(snapshotHash(a), snapshotHash({ ...a, z: 2 }));
assert.throws(() => snapshotHash({ value: Infinity }), /non-finite/);
assert.throws(() => snapshotHash({ value: NaN }), /non-finite/);
console.log('PASS vidik-snapshot-hash');
