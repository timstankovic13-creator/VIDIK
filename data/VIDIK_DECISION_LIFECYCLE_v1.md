# VIDIK Decision Lifecycle v1

## Purpose

Define the canonical, auditable path from a municipal question to a recommendation or an explicit block. The lifecycle must not require developer/manual rescue.

## State machine

`INTAKE → QUESTION_LOCK → EVIDENCE_SCAN → ADMISSIBILITY → MODEL_BUILD → COUNTERFACTUAL → ANALYSIS → DECISION_OUTPUT → HUMAN_DECISION → AUDIT_SNAPSHOT → OUTCOME_REVIEW → LEARNING`

Any failed mandatory gate transitions to `NO_RECOMMENDATION` (or `INCONCLUSIVE / DATA FAILURE` when the experiment contract explicitly permits that learning state). No failed gate may be silently bypassed.

## Required state artifacts

1. **INTAKE** — decision owner, jurisdiction, decision date, resource unit, objective, deadline.
2. **QUESTION_LOCK** — exact decision question, claim scope, normative priorities, historical/current plane.
3. **EVIDENCE_SCAN** — candidate evidence inventory, provenance, dates, granularity, MSE package.
4. **ADMISSIBILITY** — temporal, provenance, quality, transportability, conflict/staleness and causal admissibility checks.
5. **MODEL_BUILD** — production/causal chain, parameters, uncertainty, assumptions and constraints.
6. **COUNTERFACTUAL** — status quo plus explicit comparison/alternative design.
7. **ANALYSIS** — optimization, sensitivity, recommendation-flip detection, VOI and uncertainty budget.
8. **DECISION_OUTPUT** — recommendation OR `NO_RECOMMENDATION`, Why, Why-not, trade-offs, uncertainty, what would change the answer.
9. **HUMAN_DECISION** — accept/modify/reject plus mandatory rationale; never overwrite the VIDIK output.
10. **AUDIT_SNAPSHOT** — immutable decision identity, evidence/model versions, inputs, output and override history.
11. **OUTCOME_REVIEW** — checkpointed actual outcomes against prediction and baseline.
12. **LEARNING** — recalibration/drift assessment; historical decisions remain immutable.

## SLA instrumentation

Record elapsed time and analyst touch count at every transition. The benchmark uses these metrics to establish a real turnaround baseline rather than relying on subjective claims of speed.

## Customer-facing promise

VIDIK promises a **fast, auditable answer or a fast, auditable explanation of why the evidence is insufficient**. It does not promise a recommendation when the evidence cannot support one.
