# Full Municipal Reference Data Acceptance

## Population/geography
- [ ] Full Statistics Canada 98-10-0002-02 artifact imported
- [ ] Every accepted CSD UID validates
- [ ] No duplicate CSD UIDs
- [ ] Reconciled against WUP municipal spine
- [ ] Missing WUP matches reported explicitly
- [ ] Numeric/range checks pass
- [ ] Suppression/missing markers handled explicitly
- [ ] Deterministic normalized artifact generated
- [ ] Source and output hashes recorded

## Annual population
- [ ] 17-10-0155-01 imported
- [ ] Reference dates/geographies validated
- [ ] CSD reconciliation passes
- [ ] Freshness metadata recorded

## Demographics/socioeconomics
- [ ] 2021 Census Profile imported
- [ ] Geography and variable metadata retained
- [ ] Missing/suppressed values handled
- [ ] Reconciliation passes

## Police/public safety
- [ ] 35-10-0077-01 imported
- [ ] Police-service geography mapped to municipal spine
- [ ] Annual reference periods validated
- [ ] Staffing/crime fields retain source metadata
- [ ] Reconciliation and range checks pass

## Release gate
No dataset becomes decision-driving until all applicable checks pass. A green fixture test is not evidence that the full national artifact has passed.
