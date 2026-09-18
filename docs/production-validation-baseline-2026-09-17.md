# VIDIK Production Validation Baseline — 2026-09-17

Baseline commit: a0fedfd01845292b738b687fe3f2f05e9fa13a27
Validation branch: validation/baseline-1-7

## Purpose
This branch is a validation-only baseline for the completed VIDIK build. It does not change production decision logic or weaken existing assertions.

## Gates
1. Mainline/baseline integrity and production-readiness controls.
2. Municipal source/adaptor and three-city validation.
3. Open-world intervention/evidence discovery.
4. Decision intelligence, quantitative lineage, sensitivity, uncertainty and VOI.
5. Decision lifecycle, persistence, audit, outcome learning and governance.
6. Hostile/regression/finish-line validation.
7. Browser end-to-end acceptance.

## Acceptance rule
A gate is green only when the existing assertions pass. A missing, stale, inadmissible or non-transportable input must fail closed or produce an explicit blocked/discovery state; it must not be converted into a recommendation merely to satisfy the test.

Actual production infrastructure provisioning and a live municipal pilot remain deployment activities after software validation; they are not represented as passed by this branch.
