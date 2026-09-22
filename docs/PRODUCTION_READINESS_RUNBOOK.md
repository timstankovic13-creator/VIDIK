# Production Readiness Runbook

## Phase 1 — repository
1. Freeze baseline SHA.
2. Validate metadata and documentation.
3. Run dependency/security scans.
4. Run full browser and hostile suites.

## Phase 2 — staging
1. Deploy exact approved SHA.
2. Verify HTTPS and health.
3. Run browser acceptance against deployed URL.
4. Perform restart and restore drills.

## Phase 3 — Ottawa
1. Configure approved public source endpoints.
2. Retrieve and record provenance.
3. Validate schema/freshness/transportability.
4. Reconcile against previous snapshot.
5. Bind evidence to parameters and decision.
6. Preserve immutable snapshot.

## Phase 4 — abuse/performance
1. Run malformed-input suite.
2. Run authorization/tenant-isolation suite.
3. Run concurrency/load test.
4. Verify graceful failure and recovery.

## Phase 5 — release
Every gate needs an environment, commit SHA, timestamp, result and artifact. Do not call the system production-ready while a required gate is merely contract-ready.
