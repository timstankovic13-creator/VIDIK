# Case 001 Development Backlog — Saved for Later

RC1/main is frozen. This file records the strengthening work without changing the frozen release.

## Completed in development branch

- Strict historical boundary: 2023-12-06.
- No synthetic publication date for the 2022 Ottawa Housing and Homelessness Update.
- Source admissibility now requires a verified publication date at or before the boundary.
- Evidence → claim → parameter reconstruction layer added.
- Parameter provenance requires source IDs and claim IDs.
- Missing normalization remains explicitly missing.
- Causal effect evidence can be represented without converting it into an Ottawa-specific marginal allocation estimate.
- Case 001 workflow runs on this development branch.
- Existing Case 001 findings/freeze artifacts are preserved in branch history.

## Next engineering work

1. Verify the exact publication date of the 2022 Ottawa Housing and Homelessness Update from an authoritative City record.
2. Trace the generator of stale 9.1.3 decision/build identifiers and correct the generator, not historical outputs.
3. Expand parameter normalization for need, baseline, effect, capacity, feasibility, cost, and time horizon.
4. Add explicit units, denominators, geography, population, measurement period, and uncertainty to every reconstructed parameter.
5. Add causal-identification and transportability gates before a reconstructed effect can enter optimization.
6. Build a marginal-resource mapping layer: marginal CAD → marginal capacity → marginal outcome.
7. Add candidate-specific feasibility rules tied to what Ottawa could actually implement by 2023-12-06.
8. Add adversarial tests for temporal leakage, missing provenance, denominator mismatch, post-boundary evidence, false precision, and assumption laundering.
9. Rerun Case 001 only after the reconstruction layer is complete.
10. Keep the sealed actual municipal decision and later outcomes outside the blind evidence path until the recommendation is frozen.

## Non-negotiable rule

Do not weaken fail-closed behavior to obtain a recommendation. The objective is a more capable evidence reconstruction system, not a more permissive guessing system.
