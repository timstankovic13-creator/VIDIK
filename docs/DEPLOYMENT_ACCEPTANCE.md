# VIDIK Staging Deployment Acceptance

## Deploy
- [ ] Exact approved commit recorded
- [ ] Node/runtime matches supported version
- [ ] No secrets committed
- [ ] HTTPS active
- [ ] Reverse proxy configured
- [ ] Process supervision/automatic restart active
- [ ] Firewall/minimum exposure configured

## Health
- [ ] Application reachable
- [ ] Static assets load
- [ ] Core decision flow works
- [ ] Acceptance suite passes against deployed instance
- [ ] Logs accessible

## Recovery
- [ ] Restart drill passes
- [ ] Snapshot/backup exists
- [ ] Restore drill passes
- [ ] Failed deployment can be rolled back
- [ ] Data/evidence snapshots remain reproducible

## Security/performance
- [ ] Dependency scan green
- [ ] CodeQL/security checks green
- [ ] Authorization/tenant isolation tested
- [ ] Input/injection tests pass
- [ ] Load/concurrency test passes agreed threshold

## Release evidence
Record environment, commit SHA, timestamps, test results and artifact references for every gate.
