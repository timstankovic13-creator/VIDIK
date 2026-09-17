'use strict';

const crypto = require('node:crypto');
const { normalizeVerifiedIdentity, assertRole } = require('./authenticated-identity');

function fail(code, detail) {
  const error = new Error(detail ? `${code}: ${detail}` : code);
  error.code = code;
  throw error;
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(stable(value)).digest('hex');
}

function requirePool(pool) {
  if (!pool || typeof pool.connect !== 'function') fail('managed-pool-required');
  return pool;
}

async function withTenantTransaction(pool, identityInput, operation) {
  const identity = normalizeVerifiedIdentity(identityInput);
  if (typeof operation !== 'function') fail('transaction-operation-required');
  const client = await requirePool(pool).connect();
  try {
    await client.query('BEGIN');
    // SET LOCAL is transaction-scoped; the value comes only from verified server identity.
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [identity.tenantId]);
    const result = await operation(client, identity);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    client.release();
  }
}

function createManagedPersistence(options = {}) {
  const pool = requirePool(options.pool);
  // Keep the verified input as the authorization source. The normalized identity is
  // returned for consumers, but is not treated as a new authentication assertion.
  const identityInput = options.identity;
  const identity = normalizeVerifiedIdentity(identityInput);

  return {
    identity,

    async createDecision(input = {}) {
      if (!input.decisionKey || typeof input.decisionKey !== 'string') fail('invalid-decision-key');
      if (input.payload === undefined) fail('decision-payload-required');
      return withTenantTransaction(pool, identityInput, async client => {
        const result = await client.query(
          `INSERT INTO vidik_decisions (tenant_id, decision_key, payload)
           VALUES (current_setting('app.tenant_id', true)::uuid, $1, $2::jsonb)
           RETURNING id, tenant_id, decision_key, payload, created_at, updated_at`,
          [input.decisionKey, JSON.stringify(input.payload)]
        );
        return result.rows[0];
      });
    },

    async getDecision(decisionKey) {
      if (!decisionKey || typeof decisionKey !== 'string') fail('invalid-decision-key');
      return withTenantTransaction(pool, identityInput, async client => {
        const result = await client.query(
          `SELECT id, tenant_id, decision_key, payload, created_at, updated_at
             FROM vidik_decisions
            WHERE decision_key = $1`,
          [decisionKey]
        );
        return result.rows[0] || null;
      });
    },

    async recordOutcome(input = {}) {
      assertRole(identityInput, ['admin', 'operator', 'reviewer']);
      const required = ['decisionId', 'parameterName', 'checkpoint', 'predicted', 'observed', 'decisionAt', 'outcomeAt'];
      for (const key of required) if (input[key] === undefined || input[key] === null) fail(`missing-outcome-field:${key}`);
      if (!Number.isFinite(input.predicted) || !Number.isFinite(input.observed)) fail('invalid-outcome-value');
      return withTenantTransaction(pool, identityInput, async client => {
        const result = await client.query(
          `INSERT INTO vidik_outcomes
             (tenant_id, decision_id, parameter_name, checkpoint, predicted, observed, decision_at, outcome_at)
           VALUES
             (current_setting('app.tenant_id', true)::uuid, $1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz)
           RETURNING id, tenant_id, decision_id, parameter_name, checkpoint, predicted, observed, error, decision_at, outcome_at, created_at`,
          [input.decisionId, input.parameterName, input.checkpoint, input.predicted, input.observed, input.decisionAt, input.outcomeAt]
        );
        return result.rows[0];
      });
    },

    async appendAudit(input = {}) {
      assertRole(identityInput, ['admin', 'operator', 'reviewer']);
      for (const key of ['eventType', 'aggregateType', 'aggregateId']) if (!input[key]) fail(`missing-audit-field:${key}`);
      return withTenantTransaction(pool, identityInput, async client => {
        const previous = await client.query(
          `SELECT event_sequence, event_hash
             FROM vidik_audit_events
            WHERE tenant_id = current_setting('app.tenant_id', true)::uuid
            ORDER BY event_sequence DESC
            LIMIT 1
            FOR UPDATE`
        );
        const previousSequence = previous.rows[0]?.event_sequence ?? 0;
        const previousHash = previous.rows[0]?.event_hash ?? '';
        const eventSequence = Number(previousSequence) + 1;
        const payload = input.payload ?? null;
        const eventHash = sha256({ tenantId: identity.tenantId, eventSequence, eventType: input.eventType, aggregateType: input.aggregateType, aggregateId: input.aggregateId, payload, previousHash });
        const result = await client.query(
          `INSERT INTO vidik_audit_events
             (tenant_id, event_sequence, event_type, aggregate_type, aggregate_id, payload, previous_hash, event_hash)
           VALUES
             (current_setting('app.tenant_id', true)::uuid, $1, $2, $3, $4::uuid, $5::jsonb, $6, $7)
           RETURNING id, tenant_id, event_sequence, event_type, aggregate_type, aggregate_id, payload, previous_hash, event_hash, created_at`,
          [eventSequence, input.eventType, input.aggregateType, input.aggregateId, JSON.stringify(payload), previousHash || null, eventHash]
        );
        return result.rows[0];
      });
    },
  };
}

module.exports = { stable, sha256, withTenantTransaction, createManagedPersistence };
