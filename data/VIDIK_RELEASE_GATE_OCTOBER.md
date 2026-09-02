# VIDIK October Release Gate

**Purpose:** use the next available GitHub Actions capacity as a release gate, not as a development loop.

## Before spending CI minutes

- [ ] Exact branch/head SHA identified.
- [ ] Changed files reviewed.
- [ ] Local deterministic tests run where possible.
- [ ] No known code defect remains.
- [ ] Expected CI jobs and failure modes are known.
- [ ] CI run has a specific release-gate purpose.

## First CI sequence after capacity returns

1. Targeted tests for all changes accumulated since the last verified main.
2. Full regression.
3. Browser acceptance.
4. Blind-batch / historical immutability checks.
5. Post-merge main baseline.

Do not spend Actions minutes on repeated identical reruns unless the failure has a newly identified cause.

## Release evidence to retain

- exact tested SHA;
- workflow/run IDs;
- all required job results;
- artifact/report identities;
- merge SHA;
- post-merge main baseline;
- any known environmental limitations.

## Definition of done

The release is green only when the exact release SHA has passed the required targeted and regression gates. Local tests are supporting evidence, never a substitute for required CI gates.
