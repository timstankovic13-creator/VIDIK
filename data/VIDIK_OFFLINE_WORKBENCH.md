# VIDIK Full Offline Workbench

## Purpose

`offline-workbench.html` is the integration surface for the complete offline-capable VIDIK scope. It corrects the earlier playground limitation: the playground exercised one core slice; the workbench exposes the existing full VIDIK application plus the RC4 evidence/experiment/release surface in one place.

## Included offline-capable scope

- Existing VIDIK decision application: decision definition, evidence registry, claims/parameters, candidates, optimization, Why/Why-not, uncertainty, VOI, learning, global municipal readiness, outcome learning, lifecycle, adapters, security/acceptance, audit and hostile validation.
- Historical decision plane: cases 001–014 frozen at `2023-12-06`.
- RC4 experiment contract/execution: marginal units, allocation/execution records, preregistration, exposure gates, checkpoints, reversibility and stop rules.
- Four-stream execution/analysis: 006 ANCHOR, 009 ASE, 010 Red Light Camera, 014 Shelter.
- Claim-scaled analysis: descriptive, decision-support and effect-estimation levels.
- Minimum Sufficient Evidence and evidence request gating.
- Fail-closed recommendation semantics.
- Canonical decision workflow and customer decision package.
- Snapshot hashing / reproducibility and offline release gates.
- Explicit separation of offline-ready software from real municipal-data and CI dependencies.

## Status labels

- `OFFLINE READY / TESTABLE`: software behavior that can be exercised without external municipal operational data or hosted CI.
- `BLOCKED — REAL MUNICIPAL DATA`: requires authorized operational exposure/allocation records, causal comparators, outcome linkage or other real-world evidence.
- `BLOCKED — ACTIONS / CI`: requires hosted GitHub Actions certification; no workflow is triggered by the workbench.
- `HISTORICALLY FROZEN`: cannot be changed by later evidence.

## Gate

Offline readiness does **not** authorize a real-world recommendation. Effect estimation and recommendation promotion still require the experiment contract, authorized marginal exposure, temporally admissible evidence, defensible causal comparator/design, and measurement readiness.

## Validation

`tests/offline-workbench-scope.test.js` is a static scope gate. It verifies that the workbench contains the required offline surface labels and embeds the existing `index.html` application. This change intentionally does not consume GitHub Actions minutes.
