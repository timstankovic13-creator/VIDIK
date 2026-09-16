'use strict';

const fs = require('fs');
const path = require('path');
const { readStore, verifyChain } = require('../js/decision-artifact-store');

function exportAuditBundle(file, output) {
  const records = readStore(file);
  const chain = verifyChain(records);
  if (!chain.ok) throw new Error('audit-export-blocked:' + chain.reason);

  const bundle = {
    schema: 'VIDIK.AuditReplayBundle.v1',
    exportedAt: new Date().toISOString(),
    source: { file, chain },
    decisions: records.map(record => ({
      sequence: record.sequence,
      previousHash: record.previousHash,
      chainHash: record.chainHash,
      decisionId: record.artifact.decisionId,
      createdAt: record.artifact.createdAt,
      artifactContentHash: record.artifact.integrity.contentHash,
      artifact: record.artifact,
      operational: {
        audit: record.artifact.audit,
        governance: record.artifact.governance,
        learning: record.artifact.learning,
        provenance: record.artifact.provenance
      }
    }))
  };

  fs.mkdirSync(path.dirname(output), { recursive: true });
  const temp = output + `.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(temp, JSON.stringify(bundle, null, 2) + '\n', 'utf8');
  fs.renameSync(temp, output);
  return bundle;
}

function replayAuditBundle(file) {
  const records = readStore(file);
  const chain = verifyChain(records);
  if (!chain.ok) return chain;
  return {
    ok: true,
    schema: 'VIDIK.AuditReplay.v1',
    chain,
    decisions: records.map(record => ({
      sequence: record.sequence,
      decisionId: record.artifact.decisionId,
      createdAt: record.artifact.createdAt,
      contentHash: record.artifact.integrity.contentHash,
      recommendation: record.artifact.decision?.rationale?.recommendation ?? null,
      audit: record.artifact.audit,
      governance: record.artifact.governance,
      learning: record.artifact.learning,
      provenance: record.artifact.provenance
    }))
  };
}

if (require.main === module) {
  const file = process.argv.find(x => x.startsWith('--input='))?.split('=')[1];
  const output = process.argv.find(x => x.startsWith('--output='))?.split('=')[1];
  if (!file || !output) throw new Error('usage: --input=<artifact-store> --output=<audit-bundle>');
  const bundle = exportAuditBundle(file, output);
  process.stdout.write(JSON.stringify({ output, count: bundle.decisions.length, head: bundle.source.chain.head }) + '\n');
}

module.exports = { exportAuditBundle, replayAuditBundle };
