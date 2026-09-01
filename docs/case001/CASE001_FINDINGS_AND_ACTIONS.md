# Ottawa Case 001 — Findings and Corrective Actions

## Status

Case 001 remains a retrospective blind validation. The historical decision boundary is **2023-12-06**.

The first blind run produced `NO RECOMMENDATION / BLOCKED`. Before treating that as a substantive model finding, two issues were investigated:

1. whether additional admissible pre-boundary Ottawa evidence could materially strengthen the case; and
2. whether the reported `9.2.0` runtime version meant the RC1 lifecycle layer was not actually present.

## Finding 1 — Evidence insufficiency is real, but the first run was too sparse

The first run supplied three admissible sources. The corrected second-pass case adds the Ottawa 2022 Housing and Homelessness Update as a fourth admissible source.

The added source provides historical Housing First outputs and retention evidence, including 151 people housed in Jan–Sep 2022, 82% one-year housing retention for singles, and 12 new Housing Based Case Managers supporting over 150 additional clients.

These facts strengthen the historical evidence base, but they do **not** establish an Ottawa marginal allocation function: need, incremental capacity per dollar, feasibility of the proposed marginal allocation, or a candidate-specific counterfactual. Therefore the fail-closed block remains appropriate unless those missing parameters can be sourced without temporal leakage.

## Finding 2 — Versioning is layered, not a single 9.6.1 engine

The browser application identifies itself as VIDIK 9.6 / V9.6.1 and loads the V9.6.1 lifecycle module. The base configuration still reports `V.version = 9.2.0`, while `decision-lifecycle-9.6.js` defines the lifecycle schema as `VIDIK.DecisionLifecycle.v9.6.1`.

This means the runtime should be described precisely as:

- **Core decision-intelligence engine:** 9.2.0
- **Lifecycle layer/schema:** 9.6.1
- **RC1 browser stack:** 9.6.1 lifecycle over the 9.2 core

The blind test has been changed to record and assert both versions instead of treating 9.2.0 as the complete RC1 version.

No production engine code was relabelled merely to make the test say 9.6.1. That would destroy provenance.

## Finding 3 — The stale canonical manifest is not authoritative for this case

`CANONICAL_BUILD_MANIFEST_MODULAR.json` still identifies an older 9.1.3 build. It is not the source used by the Case 001 runtime. The runtime provenance for this experiment is the actual branch commit plus the loaded browser modules.

This is now treated as a documentation/build-manifest debt item, not silently corrected by changing the historical result.

## Corrective action

The Case 001 blind runtime now:

- uses four admissible pre-boundary evidence records;
- keeps the adopted budget, 2023 progress report and 2024 CMHC report sealed;
- records the core engine and lifecycle versions separately;
- continues to require `NO RECOMMENDATION` when candidate-specific parameters are missing;
- must pass CI before this second-pass result is frozen.

## Decision rule

If the strengthened run remains blocked, the conclusion is **not** that Housing First was ineffective or that Ottawa's actual decision was wrong. The conclusion is that this historical case does not contain enough admissible candidate-specific information to reconstruct a defensible marginal allocation decision using the current engine.

The next useful engineering target is therefore a proper historical parameter-reconstruction layer, not a relaxation of the evidence gates.
