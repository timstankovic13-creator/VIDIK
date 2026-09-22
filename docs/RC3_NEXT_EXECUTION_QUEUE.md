# RC3 Next Execution Queue

## Current gate

The system may prepare execution records, but it must not claim an effect or recommendation without actual authorized exposure and an admissible counterfactual.

## Priority order

1. Cases 003, 011, 012 — acquire authorized marginal allocation and actual exposure records.
2. Cases 004–010 — instantiate the same execution-record controls.
3. Cases 013–014 — instantiate the same controls.
4. For every case, attempt the strongest defensible counterfactual before effect estimation.
5. Run hostile validation before any recommendation can be promoted.
6. Start outcome learning only from a frozen prediction and measured exposure.

## Evidence acquisition priority

Prefer candidate-specific marginal exposure, counterfactual, attribution, transportability, and measurement readiness. Total program spending, aggregate outputs, simple before/after changes, or post-boundary evidence cannot substitute for these requirements.

## Promotion rule

`BLOCKED -> READY_FOR_EFFECT_ESTIMATION -> EFFECT_ESTIMATE_REVIEW -> DECISION_ELIGIBLE`

A case can remain blocked indefinitely. There is no automatic promotion merely because more documents were ingested.
