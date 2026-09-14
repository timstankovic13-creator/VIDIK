# VIDIK Nine-Gap Trustworthiness Hardening

This phase converts the nine architectural gaps identified by the adversarial decision matrix into explicit fail-closed controls.

1. Evidence quality is derived from trusted evidence metadata rather than caller assertions.
2. Duplicate evidence identifiers are rejected.
3. Evidence freshness is checked as an admissibility condition when retrieval metadata is present.
4. Missing evidence records fail closed.
5. Marginal-resource models require compatible resource/currency units.
6. Human overrides require authorization, actor, reason, timestamp, and an audit hash.
7. Partial source outages are represented explicitly and preserve available results without pretending the run is complete.
8. Transferability uses multi-dimensional similarity and remains lead-only; causal effects are never imported.
9. Evidence from the wrong jurisdiction is independently rejected.

The controls are covered by `tests/vidik-nine-gaps-hardening.test.js` and a dedicated CI workflow. Existing decision gates remain authoritative; this phase does not weaken recommendation or evidence requirements.
