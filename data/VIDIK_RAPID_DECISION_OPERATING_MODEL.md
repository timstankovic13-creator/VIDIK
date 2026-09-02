# VIDIK Rapid Decision Operating Model v1

**Purpose:** define a repeatable turnaround path for municipal resource-allocation decisions without weakening evidentiary standards.

## Service path

### Stage 0 — Intake (0–2 hours)
- Define the decision question, decision date, resource unit, options, constraints, requested confidence, and deadline.
- Freeze the historical/current evidence boundary.
- Classify the intended output: `RECOMMENDATION`, `DECISION_SUPPORT`, or `NO_RECOMMENDATION`.

### Stage 1 — Evidence triage (same day)
- Run minimum-sufficient-evidence requirements for the exact claim.
- Check temporal admissibility, provenance, transportability, staleness, conflicts, and missingness.
- Stop unnecessary acquisition immediately; request only frozen material fields.

### Stage 2 — Model construction (Day 1)
- Map resource → capacity → activity → outcome → system outcome → serious-harm pathway.
- Identify counterfactual/comparator and causal identification strategy.
- Quantify uncertainty and correlated uncertainty where estimable.

### Stage 3 — Decision analysis (Day 1–2)
- Run status quo and alternatives.
- Run sensitivity/recommendation-flip analysis.
- Run VOI when unresolved uncertainty could change the decision.
- Produce Why / Why-not / trade-offs / uncertainty / assumptions.

### Stage 4 — Integrity review (Day 2)
- Verify evidence admissibility, model integrity, audit trail, historical identity, and human-override handling.
- Confirm the result is reproducible from the frozen inputs.
- Fail closed if a required gate is not satisfied.

### Stage 5 — Client decision package (Day 2–3 target)
- One-page executive answer.
- Evidence and model appendix.
- Alternatives and status quo.
- Uncertainty and what would change the answer.
- Audit/export package.

## Turnaround targets

- **Fast path:** <= 1 business day for bounded decision-support questions with already-available evidence.
- **Standard path:** <= 3 business days for a defensible recommendation when evidence and model inputs are available.
- **Evidence-acquisition path:** target <= 5 business days for the analysis after required municipal data are supplied; acquisition latency is reported separately.
- **Blocked path:** immediate `NO_RECOMMENDATION` with an explicit missing-gate explanation rather than artificial delay.

## Operating rule

Speed comes from narrowing the claim and acquiring only minimum-sufficient evidence—not from lowering the evidence threshold.

## Required telemetry

Every engagement should record:
- intake timestamp;
- first-answer timestamp;
- defensible-answer timestamp;
- evidence acquisition time;
- analyst/manual intervention time;
- gate failures;
- output class;
- recommendation stability;
- human override/correction;
- audit completeness;
- reproducibility result.

These metrics become the VIDIK Decision Benchmark and the evidence for commercial claims about turnaround.
