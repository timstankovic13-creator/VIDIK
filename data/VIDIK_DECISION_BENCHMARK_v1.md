# VIDIK Decision Benchmark v1

**Purpose:** prove that VIDIK can produce fast, defensible municipal decisions repeatedly, not merely pass engineering tests.

## Core benchmark dimensions

| Metric | Definition | Required interpretation |
|---|---|---|
| Time to first answer | Intake → first machine-generated answer | Speed of initial orientation |
| Time to defensible answer | Intake → integrity-approved output | Primary turnaround metric |
| Evidence retrieval burden | Human minutes + source count required | Automation efficiency |
| Resolution rate | Cases reaching recommendation/decision-support without unnecessary blocking | Workflow effectiveness |
| Appropriate block rate | Cases correctly stopped by a required evidence/governance gate | Safety, not failure |
| Human correction rate | Outputs requiring substantive human correction | Decision quality signal |
| Recommendation stability | Share unchanged under preregistered perturbation/sensitivity tests | Robustness |
| Audit completeness | Required provenance, model, rationale and override fields present | Auditability |
| Reproducibility | Same frozen inputs produce same decision object/output | Determinism |
| Manual rescue rate | Cases requiring undocumented/manual code or data intervention | Productization risk |

## Benchmark corpus

Maintain three classes:

1. **Synthetic controlled cases** — known ground truth for engine behavior and failure modes.
2. **Historical municipal cases** — frozen evidence boundary; no later information allowed to alter the historical answer.
3. **Prospective shadow cases** — real municipal decisions analyzed in parallel with the existing process, without substituting VIDIK for the authorized decision-maker.

## Acceptance gates

A benchmark release is not commercially representative unless:
- every case has an immutable input identity;
- evidence eligibility is frozen before scoring;
- recommendation and `NO_RECOMMENDATION` outcomes are both scored;
- no benchmark case is silently repaired after execution;
- failed cases retain their failure reason;
- repeated runs are deterministic;
- latency is measured separately from external data-acquisition latency;
- results are exportable for audit.

## Commercial proof threshold

Before making a public turnaround claim, run a preregistered benchmark and record the full distribution (median, P90 and worst case), not only the fastest examples. Separate bounded decision-support from evidence-acquisition cases and from intentionally blocked cases.

## Baseline comparison

For pilot customers, capture the same metrics for the existing municipal workflow. Compare:
- elapsed time;
- staff hours;
- evidence/source handling;
- revisions;
- decision confidence;
- audit completeness.

The benchmark measures **decision-process improvement**, not whether VIDIK's recommendation agrees with a human merely because it agrees.
