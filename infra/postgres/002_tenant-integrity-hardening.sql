-- VIDIK tenant-integrity hardening migration.
-- Safe deployment rule: run this before any production tenant data exists.
-- It deliberately aborts if the legacy audit table already contains rows because
-- the old schema did not persist an event sequence required for deterministic
-- hash-chain replay.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM vidik_audit_events LIMIT 1) THEN
    RAISE EXCEPTION 'vidik-audit-migration-requires-empty-audit-table';
  END IF;
END $$;

ALTER TABLE vidik_decisions
  ADD CONSTRAINT vidik_decisions_id_tenant_unique UNIQUE (id, tenant_id);

ALTER TABLE vidik_outcomes
  DROP CONSTRAINT IF EXISTS vidik_outcomes_decision_id_fkey;

ALTER TABLE vidik_outcomes
  ADD CONSTRAINT vidik_outcomes_decision_tenant_fk
  FOREIGN KEY (decision_id, tenant_id) REFERENCES vidik_decisions(id, tenant_id);

ALTER TABLE vidik_audit_events
  ADD COLUMN event_sequence bigint;

ALTER TABLE vidik_audit_events
  ALTER COLUMN event_sequence SET NOT NULL;

ALTER TABLE vidik_audit_events
  ADD CONSTRAINT vidik_audit_events_tenant_sequence_unique UNIQUE (tenant_id, event_sequence);

ALTER TABLE vidik_audit_events
  ADD CONSTRAINT vidik_audit_events_sequence_positive CHECK (event_sequence > 0);

ALTER TABLE vidik_decisions FORCE ROW LEVEL SECURITY;
ALTER TABLE vidik_outcomes FORCE ROW LEVEL SECURITY;
ALTER TABLE vidik_audit_events FORCE ROW LEVEL SECURITY;
