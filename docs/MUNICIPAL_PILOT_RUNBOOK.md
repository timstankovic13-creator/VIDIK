# VIDIK municipal pilot runbook

## 1. Intake

Define the municipal decision as an explicit objective, geography, population, time window, resource envelope, candidate interventions, constraints and decision owner.

**Do not proceed** if the objective is ambiguous or if a proposed recommendation depends on an unverified municipal observation being treated as causal evidence.

## 2. Municipal source connection

For each source, capture provider, URL, source type, jurisdiction, record identifier, retrieval timestamp and freshness metadata. Reconcile the municipality to a stable geographic identity before enrichment.

Initial reproducible adapters:

- Ottawa — City of Ottawa Open Data
- Toronto — City of Toronto Open Data
- Melbourne — City of Melbourne Open Data

## 3. Evidence review

Separate three layers:

1. municipal observed context;
2. causal evidence and its estimate/uncertainty;
3. transportability/admissibility assessment.

No local observation, city similarity score or population estimate may silently become a causal parameter.

## 4. Decision run

Run the canonical decision pipeline. The decision object should expose:

- objective and constraints;
- evidence and provenance;
- admissible parameters;
- causal model;
- uncertainty budget;
- sensitivity drivers;
- recommendation-flip thresholds;
- VOI/information priorities;
- alternatives/counterfactuals;
- rationale;
- governance/override state;
- learning and drift state;
- integrity information.

## 5. Challenge the recommendation

A reviewer should be able to ask:

- What evidence caused this recommendation?
- Which parameter matters most?
- How uncertain is it?
- What would have to change to flip the recommendation?
- What information would be most valuable to acquire next?
- Which alternatives were considered?
- What was observed locally versus inferred from causal evidence?
- Can the exact decision artifact be verified and replayed?

## 6. Governance

Before a municipal decision is acted upon, record decision authority, reviewer/approver, permitted override, rationale for override, timestamp and audit event. Overrides must not erase the original recommendation or evidence chain.

## 7. Outcome learning

Create the outcome plan before implementation. Use the 6-month, 1-year, 2-year and 5-year checkpoints where applicable. Record outcomes against the original decision artifact. Recalibration is a controlled signal; it does not silently rewrite history.

## 8. Pilot acceptance

A pilot is not production-certified until the deployment environment demonstrates managed persistence, authenticated tenant isolation, managed secrets, TLS, encrypted/tested backups, recovery, monitoring and audit-integrity controls.

## 9. Pilot exit criteria

A municipality should be able to demonstrate:

- reproducible source ingestion;
- evidence/provenance review;
- complete decision artifact;
- independent challenge of the recommendation;
- governance approval/override record;
- outcome ownership and review schedule;
- successful artifact integrity verification;
- documented incident and rollback procedure.
