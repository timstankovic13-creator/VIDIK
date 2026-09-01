# VIDIK 9.2.1 Production Readiness

## Current status
The 9.2.1 baseline is frozen and validated on `main`. Production-readiness work is isolated on a separate branch until all gates pass.

## Gates
- [x] Frozen validated baseline
- [x] Full browser acceptance on merged main
- [x] Strict transportability validation
- [x] Strict uncertainty validation
- [x] Strict VOI validation
- [x] Evidence-backed decision integration
- [ ] Release metadata synchronized
- [ ] Dependency/security scan green
- [ ] CodeQL green
- [ ] Staging deployment with real externally reachable environment
- [ ] Health check against deployed staging service
- [ ] Recovery/rollback drill against deployed environment
- [ ] Ottawa live adapter with authenticated/authorized source access where required
- [ ] Live evidence provenance and reconciliation test
- [ ] Load/performance test
- [ ] Tenant-isolation/security test
- [ ] Accessibility/user acceptance test
- [ ] Independent security review

## Ottawa adapter contract
The adapter must preserve source URL, retrieval timestamp, source status, source geography, transportability assessment, claims, parameter derivation, uncertainty, and evidence IDs. No recommendation-driving parameter may bypass provenance validation.

## Release rule
A green browser suite alone is not sufficient for production release. Every unchecked gate above must be either completed with evidence or explicitly waived by the deployment owner with rationale.
