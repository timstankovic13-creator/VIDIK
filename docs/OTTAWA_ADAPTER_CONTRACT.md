# Ottawa Municipal Adapter — Production Contract

The Ottawa adapter is intentionally implemented as a controlled-server-side contract first. It must not fabricate live municipal data or silently substitute stale reference data.

## Required flow
1. Retrieve from the configured Ottawa source.
2. Record source URL and retrieval timestamp.
3. Validate HTTPS and source status.
4. Validate schema and required claims.
5. Validate freshness and transportability.
6. Reconcile the incoming record against the prior version.
7. Record additions, removals, modifications, and unchanged records.
8. Bind recommendation-driving parameters to evidence IDs and derivation metadata.
9. Reject the update if provenance or reconciliation gates fail.
10. Persist an immutable dataset snapshot for the decision.

## Production prerequisite
A live deployment endpoint and approved Ottawa source credentials/API access are required to execute the live retrieval stage. Until those are supplied/configured, CI must report the adapter as contract-ready rather than claiming live ingestion.
