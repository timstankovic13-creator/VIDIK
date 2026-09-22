# VIDIK production deployment acceptance

This repository now contains the managed-persistence foundation, but production deployment is still an environment-level gate.

## Required before pilot

1. **Managed PostgreSQL** provisioned with `infra/postgres/001_vidik_core.sql` and TLS enforced.
2. **Authentication provider** configured; the application receives a verified identity containing tenant and role claims.
3. **Server-side tenant binding**: every transaction sets `app.tenant_id` from the verified identity before accessing tenant tables.
4. **Managed secrets**: database credentials, auth configuration and signing material come from the deployment platform's secret manager.
5. **Encrypted backups** with documented retention and a successful restore exercise.
6. **Audit integrity monitoring** for hash-chain failures, unauthorized writes and failed append operations.
7. **Operational alerts** for authentication failures, authorization denials, source-ingestion failures, integrity failures and outcome-learning lifecycle failures.
8. **TLS-only public endpoint** and certificate validation between application and database.

## Configuration contract

Production startup must validate `scripts/production-config.js`. Local/file-backed outcome storage is permitted for development and CI only and must not be used as a production fallback.

## Explicit non-claims

A passing repository test suite does not prove that a managed database, identity provider, secret manager, backup system or production TLS endpoint has actually been provisioned. Those controls must be evidenced by the deployment environment.
