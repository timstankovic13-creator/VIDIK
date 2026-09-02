# VIDIK Release Candidate Manifest v1

This manifest is the checklist for the first CI-authoritative release window after Actions capacity returns.

## Local prerequisites

- benchmark fixtures frozen;
- canonical lifecycle tests pass locally;
- MSE/request-gate tests pass locally;
- adapter portability tests pass locally;
- adversarial/reproducibility tests pass locally;
- customer-package integrity checks pass locally;
- no unreviewed speculative workflow changes.

## CI sequence

Targeted unit tests → browser acceptance → full regression → benchmark fixtures → main-baseline verification at actual merge SHA.

## Failure discipline

One failing gate means inspect the exact run/SHA/log and patch root cause. No blind rerun. No claim of green until the corrected workflow actually succeeds.
