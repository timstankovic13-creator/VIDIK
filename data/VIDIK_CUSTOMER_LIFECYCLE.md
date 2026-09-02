# Customer Decision Lifecycle

The customer-facing workflow is one auditable chain:

`Question → Scope → Evidence → Eligibility → Allocation → Human Decision → Implementation → Review → Outcome → Recalibration`

## Required invariants
- historical decision snapshot is immutable;
- human choice is recorded separately from VIDIK's output;
- every recommendation has evidence/parameter lineage;
- blocked decisions remain visibly blocked;
- outcome review cannot rewrite the original decision;
- recalibration creates a new model state with provenance;
- audit export is reproducible from the decision snapshot.

The customer package should contain the answer, rationale, alternatives, evidence status, uncertainty, assumptions, override history, and review schedule without exposing unsupported causal claims.
