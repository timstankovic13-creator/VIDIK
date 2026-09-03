# VIDIK Customer Decision Lifecycle

`Question → Scope → Evidence → Eligibility → Allocation → Human Decision → Implementation → Review → Outcome → Recalibration`

## Invariants
- historical decision snapshot is immutable;
- human choice is stored separately from VIDIK output;
- recommendation lineage includes evidence and parameters;
- blocked decisions remain blocked;
- outcome review cannot rewrite the original decision;
- recalibration creates a new model state with provenance;
- audit export is reproducible from the frozen snapshot.

A customer package must expose answer, rationale, alternatives, evidence status, uncertainty, assumptions, override history and review schedule without implying unsupported causal claims.
