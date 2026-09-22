'use strict';

const crypto = require('node:crypto');

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

const sha256 = value => crypto.createHash('sha256').update(stable(value)).digest('hex');

function assertTenantId(tenantId) {
  if (typeof tenantId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tenantId)) {
    throw new Error('authenticated-tenant-id-required');
  }
}

function assertDecisionKey(decisionKey) {
  if (typeof decisionKey !== 'string' || decisionKey.length < 1 || decisionKey.length > 200) {
    throw new Error('decision-key-required');
  }
}

async function withTenant(client, tenantId, work) {
  assertTenantId(tenantId);
  await client.query('BEGIN');
  try {
    await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', tenantId]);
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function ensureTenant(client, tenantId, name = 'VIDIK tenant') {
  assertTenantId(tenantId);
  await client.query(
    'INSERT INTO vidik_tenants (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
    [tenantId, name],
  );
}

async function nextAuditSequence(client, tenantId) {
  const result = await client.query(
    'SELECT COALESCE(MAX(event_sequence), 0) + 1 AS sequence, (SELECT event_hash FROM vidik_audit_events WHERE tenant_id = $1 ORDER BY event_sequence DESC LIMIT 1) AS previous_hash FROM vidik_audit_events WHERE tenant_id = $1',
    [tenantId],
  );
  return {
    sequence: Number(result.rows[0].sequence),
    previousHash: result.rows[0].previous_hash || null,
  };
}

async function appendAuditEvent(client, tenantId, { eventType, aggregateType, aggregateId, payload }) {
  const { sequence, previousHash } = await nextAuditSequence(client, tenantId);
  const eventHash = sha256({
    tenantId,
    eventSequence: sequence,
    eventType,
    aggregateType,
    aggregateId,
    payload,
    previousHash,
  });
  await client.query(
    `INSERT INTO vidik_audit_events
      (tenant_id, event_sequence, event_type, aggregate_type, aggregate_id, payload, previous_hash, event_hash)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)`,
    [tenantId, sequence, eventType, aggregateType, aggregateId, JSON.stringify(payload), previousHash, eventHash],
  );
  return { sequence, previousHash, eventHash };
}

function createPostgresDecisionStore(pool) {
  if (!pool || typeof pool.connect !== 'function') throw new Error('postgres-pool-required');

  return {
    async saveDecision({ tenantId, decisionKey, artifact, tenantName }) {
      assertDecisionKey(decisionKey);
      if (!artifact || typeof artifact !== 'object') throw new Error('decision-artifact-required');
      const client = await pool.connect();
      try {
        return await withTenant(client, tenantId, async db => {
          await ensureTenant(db, tenantId, tenantName);
          const decision = await db.query(
            `INSERT INTO vidik_decisions (tenant_id, decision_key, payload)
             VALUES ($1,$2,$3::jsonb)
             ON CONFLICT (tenant_id, decision_key)
             DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
             RETURNING id, decision_key, created_at, updated_at`,
            [tenantId, decisionKey, JSON.stringify(artifact)],
          );
          const row = decision.rows[0];
          const audit = await appendAuditEvent(db, tenantId, {
            eventType: 'DECISION_SAVED',
            aggregateType: 'decision',
            aggregateId: row.id,
            payload: { decisionKey, artifactHash: artifact.integrity?.contentHash || null },
          });
          return { decision: row, audit };
        });
      } finally {
        client.release();
      }
    },

    async recordOutcome({ tenantId, decisionId, parameterName, checkpoint, predicted, observed, decisionAt, outcomeAt }) {
      const client = await pool.connect();
      try {
        return await withTenant(client, tenantId, async db => {
          const result = await db.query(
            `INSERT INTO vidik_outcomes
              (tenant_id, decision_id, parameter_name, checkpoint, predicted, observed, decision_at, outcome_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             ON CONFLICT (tenant_id, decision_id, parameter_name, checkpoint)
             DO UPDATE SET predicted=EXCLUDED.predicted, observed=EXCLUDED.observed, outcome_at=EXCLUDED.outcome_at
             RETURNING id, decision_id, parameter_name, checkpoint, predicted, observed, error`,
            [tenantId, decisionId, parameterName, checkpoint, predicted, observed, decisionAt, outcomeAt],
          );
          const row = result.rows[0];
          const audit = await appendAuditEvent(db, tenantId, {
            eventType: 'OUTCOME_RECORDED',
            aggregateType: 'decision',
            aggregateId: decisionId,
            payload: { outcomeId: row.id, parameterName, checkpoint, predicted, observed },
          });
          return { outcome: row, audit };
        });
      } finally {
        client.release();
      }
    },

    async getDecision({ tenantId, decisionKey }) {
      assertDecisionKey(decisionKey);
      assertTenantId(tenantId);
      const client = await pool.connect();
      try {
        return await withTenant(client, tenantId, async db => {
          const result = await db.query(
            'SELECT id, decision_key, payload, created_at, updated_at FROM vidik_decisions WHERE tenant_id=$1 AND decision_key=$2',
            [tenantId, decisionKey],
          );
          return result.rows[0] || null;
        });
      } finally {
        client.release();
      }
    },

    async verifyAuditChain({ tenantId }) {
      assertTenantId(tenantId);
      const client = await pool.connect();
      try {
        return await withTenant(client, tenantId, async db => {
          const result = await db.query(
            'SELECT event_sequence, event_type, aggregate_type, aggregate_id, payload, previous_hash, event_hash FROM vidik_audit_events WHERE tenant_id=$1 ORDER BY event_sequence ASC',
            [tenantId],
          );
          let previousHash = null;
          for (const row of result.rows) {
            if ((row.previous_hash || null) !== previousHash) return { ok: false, reason: 'audit-chain-link-mismatch', sequence: Number(row.event_sequence) };
            const expected = sha256({
              tenantId,
              eventSequence: Number(row.event_sequence),
              eventType: row.event_type,
              aggregateType: row.aggregate_type,
              aggregateId: row.aggregate_id,
              payload: row.payload,
              previousHash,
            });
            if (expected !== row.event_hash) return { ok: false, reason: 'audit-event-hash-mismatch', sequence: Number(row.event_sequence) };
            previousHash = row.event_hash;
          }
          return { ok: true, length: result.rows.length, head: previousHash };
        });
      } finally {
        client.release();
      }
    },
  };
}

module.exports = { createPostgresDecisionStore, stable, sha256, assertTenantId };
