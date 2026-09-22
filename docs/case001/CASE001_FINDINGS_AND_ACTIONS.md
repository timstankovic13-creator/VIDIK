# Ottawa Case 001 — Findings and Corrective Actions

## Status

Case 001 remains a retrospective blind validation. The historical decision boundary is **2023-12-06**.

RC1/main remains frozen. Strengthening work is isolated on `dev-historical-parameter-reconstruction`.

## Finding 1 — Historical evidence must be separated from historical parameters

The original blind runtime correctly failed closed because the evidence records did not supply candidate-specific need, capacity, feasibility, or a defensible marginal allocation function.

The development branch now adds a deterministic historical parameter-reconstruction layer. It separates:

`source → claim → normalized parameter → decision`

Every reconstructed parameter must carry source IDs and claim IDs. Missing normalization remains `missing`; it is never silently converted into an assumption.

## Finding 2 — Temporal admissibility was too permissive

The City of Ottawa document page for the **2022 Housing and Homelessness Update** does not expose a verified publication date in the evidence currently available. The previous test used a synthetic `2023-01-01` date. That was not acceptable for a strict retrospective.

The development branch removes that synthetic date. The source is retained as a candidate evidence record but is **excluded from the admissible blind set until its publication date is independently verified**. The City document page identifies it as the 2022 Housing and Homelessness Update, but the page itself does not establish an exact publication date. citeturn0search0

This is a deliberate strengthening: uncertain chronology blocks use rather than being guessed.

## Finding 3 — The first causal effect can be represented without pretending it is Ottawa's marginal allocation function

The At Home/Chez Soi randomized evidence can support an observed causal effect parameter with explicit transportability and uncertainty metadata. It does **not** automatically establish Ottawa-specific marginal capacity, cost, feasibility, or need.

The development test therefore permits the effect parameter to be reconstructed from the admissible randomized evidence while keeping capacity and feasibility missing. The case remains blocked.

## Finding 4 — Versioning is layered

The runtime remains precisely described as:

- **Core decision-intelligence engine:** 9.2.0
- **Lifecycle layer/schema:** 9.6.1
- **RC1 browser stack:** 9.6.1 lifecycle over the 9.2 core

No production engine code is relabelled merely to make versions match.

## Finding 5 — Stale generated provenance remains a separate debt item

The previously observed stale 9.1.3 lineage in generated decision identifiers/build-manifest material is retained as a development cleanup item. It must be corrected by tracing the generator/manifest source, not by editing historical output after the fact.

## Corrective engineering now saved on development branch

1. `js/historical-parameter-reconstruction.js` — strict source admissibility plus claim-to-parameter reconstruction.
2. `tests/e2e/case001-ottawa-blind.spec.js` — strict temporal gate, verified-date requirement, parameter provenance assertions, and fail-closed checks.
3. `.github/workflows/case001-blind-run.yml` — Case 001 validation now runs on the development branch as well as the case branch.
4. Existing Case 001 dossier/findings/freeze artifacts remain in the development branch history for later work.

## Development rule

A successful reconstruction test is **not** defined as producing a recommendation. It is defined as extracting every defensible historical parameter while preserving provenance, uncertainty, temporal integrity, and fail-closed behavior.

If the strengthened case remains blocked, that is a valid finding. The next target is to source or defensibly derive the missing historical marginal parameters—not to relax the gates.
