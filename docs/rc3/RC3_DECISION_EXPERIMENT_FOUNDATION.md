# RC3 Decision Experiment Foundation

## Purpose

RC3 moves VIDIK from evidence/governance readiness into a reproducible decision-and-learning experiment. The historical RC1 decision record remains immutable; RC3 records what is predicted, implemented, measured, and learned afterward.

## Required contract

Every candidate entering RC3 must register:

- problem definition and baseline
- intervention
- marginal resource and common resource unit
- expected mechanism
- predicted outcome
- counterfactual
- alternatives
- uncertainty
- success/failure thresholds
- measurement plan
- candidate ID, decision ID, and immutable historical-decision hash

A contract without these fields cannot be created.

## Prediction freeze

Before outcome observation, VIDIK freezes the predicted effect, primary outcome, evaluation method, and success threshold. A second prediction freeze is rejected. Later observations are recorded as new immutable records and cannot rewrite the prediction or historical identity.

## Allocation ledger

Actual resource exposure is append-only. Each allocation records resource, quantity, recipient, and implementation start date. Subsequent allocations create a new ledger version rather than rewriting prior exposure.

## Counterfactual design

The evaluation method must be explicit. Supported classifications are randomized, quasi-experimental, matched comparison, interrupted time series, controlled before/after, contribution analysis, observational, or none. Comparison definition and identification limitations are mandatory. An observational design is not promoted to causal evidence merely because an outcome changed.

## Spillover / displacement

Each experiment must assess potential geographic, population, service, or temporal displacement (or explicitly record that none is expected) and name its measurement approach.

## Learning failure

If implementation occurs but the primary outcome cannot be measured reliably, the status is `INCONCLUSIVE_DATA_FAILURE`. It is never silently converted into success or failure.

## Stop / rollback rules

Every experiment must define maximum exposure, review point, stop condition, rollback condition, reallocation condition, and escalation condition before execution.

## Human decision separation

VIDIK recommendation, human decision, reason for agreement/deviation, and actual allocation are distinct records. This prevents later outcome learning from attributing a human implementation choice to the model itself.

## RC3 execution order

1. Acquire candidate-specific marginal exposure and counterfactual evidence.
2. Complete attribution and transportability analysis.
3. Establish outcome/system-outcome and serious-harm pathways.
4. Build a defensible common marginal resource unit.
5. Run uncertainty, sensitivity, alternatives, status-quo, and adversarial recommendation-flip tests.
6. Only candidates clearing RC2 gates and the RC3 experiment contract may become model-eligible.
7. Freeze the prediction before observing outcomes.
8. Record actual allocation and implementation deviations separately from the recommendation.
9. Evaluate outcomes at the registered checkpoints.
10. Feed learning forward without mutating the original decision.

## Fail-closed rule

No missing evidence is replaced by assumption. No historical evidence is backfilled from later events. No observational association is presented as causal impact. No inconclusive measurement is counted as success.
