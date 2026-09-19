'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { WORKSPACE_DEFINITIONS, buildWorkspaceContext, workspaceOutputTemplate } = require('../js/domain-workspaces');

test('each nonmunicipal workspace has a distinct job, inputs and outputs', () => {
  const keys = ['business','community','research','enterprise'];
  assert.deepEqual(Object.keys(WORKSPACE_DEFINITIONS), keys);
  const purposes = new Set();
  for (const key of keys) {
    const d = WORKSPACE_DEFINITIONS[key];
    assert.ok(d.purpose);
    assert.ok(d.fields.length >= 5);
    assert.ok(d.output.length >= 4);
    purposes.add(d.purpose);
    assert.equal(workspaceOutputTemplate(key).length, d.output.length);
    const input = Object.fromEntries(d.fields.map(([field]) => [field, `test-${field}`]));
    const ctx = buildWorkspaceContext(key, input);
    assert.equal(ctx.workspace, key);
    assert.equal(Object.keys(ctx.fields).length, d.fields.length);
  }
  assert.equal(purposes.size, keys.length);
});

test('workspace context rejects unsupported audiences instead of silently using municipal structure', () => {
  assert.throws(() => buildWorkspaceContext('municipal', {}), /unsupported-workspace/);
});
