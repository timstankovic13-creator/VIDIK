# RC3 Execution Readiness

Effect estimation is not executable merely because an experiment contract exists. A case must pass every execution gate below.

1. **Contract complete** — the pre-registration contract is complete and frozen.
2. **Authorized allocation** — an actual authorized resource allocation exists; planned or historical aggregate spending does not satisfy this gate.
3. **Actual exposure** — the allocated marginal resource was actually delivered/exposed in a timestamped, auditable ledger.
4. **Admissible evidence** — evidence is candidate-specific, provenance-complete, temporally admissible for its intended plane, and free of unresolved conflicts/transportability failures.
5. **Defensible counterfactual** — a causal comparison design exists and its limitations are explicit. Descriptive before/after evidence cannot silently become causal evidence.
6. **Measurement ready** — the primary outcome, comparator, data linkage, and quality checks are operational before effect estimation.

If any gate fails, the state is `BLOCKED`. The system must not manufacture an effect, ROI, or recommendation. Historical RC1/RC2 decisions remain immutable; current prospective execution is a separate learning plane.

The gate intentionally separates:

`experiment contract → authorization → actual exposure → admissible evidence → counterfactual → measurement → effect estimation`

A complete gate may produce `READY_FOR_EFFECT_ESTIMATION`; it does **not** itself produce a policy recommendation.
