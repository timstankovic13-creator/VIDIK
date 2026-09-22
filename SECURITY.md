# VIDIK Production Security Contract

VIDIK must not be promoted to production until deployment infrastructure satisfies all controls below.

## Required controls

- **Managed persistence:** lifecycle and decision records must be stored in managed server-side persistence; browser localStorage is development/test storage only.
- **Authentication and authorization:** production access requires authenticated identities and least-privilege authorization by tenant and role.
- **Secrets:** credentials and signing keys are supplied by a managed secrets system and never committed to source.
- **TLS:** all production application and data-service traffic uses TLS with certificate validation.
- **Audit integrity:** decision, override, outcome, recalibration, and governance events are append-only and integrity-protected.
- **Backups:** managed persistence has encrypted, tested backups with defined retention.
- **Recovery:** restore procedures are documented and periodically exercised, including integrity verification after restore.
- **Tenant isolation:** tenant identifiers are enforced server-side; client-controlled tenant values are never trusted for authorization.
- **Dependency security:** locked dependencies and high-severity vulnerability checks are required in CI.
- **Operational monitoring:** authentication failures, authorization denials, source failures, integrity failures, and lifecycle failures are observable and alertable.

## Release rule

A green application test suite is necessary but not sufficient for production. The infrastructure controls above must be evidenced by the deployment environment before a production pilot.
