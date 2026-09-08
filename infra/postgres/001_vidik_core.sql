-- VIDIK managed persistence foundation (PostgreSQL 15+)
-- Production application must set app.tenant_id from the authenticated identity.
-- Do not accept tenant_id from an untrusted browser payload.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS vidik_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vidik_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES vidik_tenants(id),
  decision_key text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, decision_key)
);

CREATE TABLE IF NOT EXISTS vidik_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES vidik_tenants(id),
  decision_id uuid NOT NULL REFERENCES vidik_decisions(id),
  parameter_name text NOT NULL,
  checkpoint text NOT NULL CHECK (checkpoint IN ('6-month','1-year','2-year','5-year')),
  predicted double precision NOT NULL CHECK (isfinite(predicted)),
  observed double precision NOT NULL CHECK (isfinite(observed)),
  error double precision GENERATED ALWAYS AS (observed - predicted) STORED,
  decision_at timestamptz NOT NULL,
  outcome_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (outcome_at >= decision_at),
  UNIQUE (tenant_id, decision_id, parameter_name, checkpoint)
);

CREATE TABLE IF NOT EXISTS vidik_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES vidik_tenants(id),
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  payload jsonb NOT NULL,
  previous_hash text,
  event_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vidik_decisions_tenant ON vidik_decisions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vidik_outcomes_tenant_decision ON vidik_outcomes(tenant_id, decision_id);
CREATE INDEX IF NOT EXISTS idx_vidik_audit_tenant_created ON vidik_audit_events(tenant_id, created_at);

ALTER TABLE vidik_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vidik_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vidik_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vidik_decisions_tenant_isolation ON vidik_decisions;
CREATE POLICY vidik_decisions_tenant_isolation ON vidik_decisions
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS vidik_outcomes_tenant_isolation ON vidik_outcomes;
CREATE POLICY vidik_outcomes_tenant_isolation ON vidik_outcomes
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

DROP POLICY IF EXISTS vidik_audit_tenant_isolation ON vidik_audit_events;
CREATE POLICY vidik_audit_tenant_isolation ON vidik_audit_events
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Audit events are append-only at the database layer.
CREATE OR REPLACE FUNCTION vidik_reject_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'vidik_audit_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS vidik_audit_no_update ON vidik_audit_events;
CREATE TRIGGER vidik_audit_no_update
BEFORE UPDATE OR DELETE ON vidik_audit_events
FOR EACH ROW EXECUTE FUNCTION vidik_reject_audit_mutation();
